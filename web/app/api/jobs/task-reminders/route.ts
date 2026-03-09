import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { sendBrevoEmail } from "@/lib/brevo";
import { env } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RunnerContext = {
  isCron: boolean;
  isAdmin: boolean;
  userId: string | null;
};

async function resolveRunner(request: Request): Promise<RunnerContext | null> {
  const cronSecret = request.headers.get("x-cron-secret");
  if (env.cronSecret && cronSecret === env.cronSecret) {
    return { isCron: true, isAdmin: true, userId: null };
  }

  const auth = await requireAuthenticatedUser();
  if (auth.response) return null;

  const role = await getUserRole(auth.user!.id);
  if (role !== "admin" && role !== "commercial") return null;

  return {
    isCron: false,
    isAdmin: role === "admin",
    userId: auth.user!.id,
  };
}

function buildExecutionKey(taskId: string, kind: "overdue" | "due_soon") {
  const dayKey = new Date().toISOString().slice(0, 10);
  return `task_reminder:${kind}:${taskId}:${dayKey}`;
}

export async function POST(request: Request) {
  const runner = await resolveRunner(request);
  if (!runner) return fail("Unauthorized to run task reminders job", 401);

  const requestUrl = new URL(request.url);
  const dryRun = requestUrl.searchParams.get("dry_run") === "true";

  const horizonIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const tasksQuery = supabaseAdmin
    .from("tasks")
    .select("id,title,description,due_date,priority,status,assigned_to,lead_id,owner_id")
    .not("due_date", "is", "null")
    .neq("status", "done")
    .lte("due_date", horizonIso)
    .order("due_date", { ascending: true })
    .limit(200);

  if (!runner.isAdmin && runner.userId) {
    tasksQuery.or(`owner_id.eq.${runner.userId},assigned_to.eq.${runner.userId}`);
  }

  const { data: tasks, error: tasksError } = await tasksQuery;
  if (tasksError) return fail("Failed to load tasks for reminders", 500, tasksError.message);

  if (!tasks || tasks.length === 0) {
    return ok({ dryRun, processed: 0, eligible: 0, sent: 0, failed: 0, skippedDuplicate: 0 });
  }

  let eligible = 0;
  let sent = 0;
  let failed = 0;
  let skippedDuplicate = 0;

  const previews: Array<{
    taskId: string;
    title: string;
    assignee: string;
    dueDate: string;
    kind: "overdue" | "due_soon";
  }> = [];

  for (const task of tasks) {
    if (!task.assigned_to || !task.due_date) {
      failed += 1;
      continue;
    }

    const assigneeResult = await supabaseAdmin.auth.admin.getUserById(task.assigned_to);
    const assigneeEmail = assigneeResult.data.user?.email;
    if (!assigneeEmail) {
      failed += 1;
      continue;
    }

    const dueMs = new Date(task.due_date).getTime();
    const kind: "overdue" | "due_soon" = dueMs < Date.now() ? "overdue" : "due_soon";
    eligible += 1;

    if (dryRun) {
      previews.push({
        taskId: task.id,
        title: task.title,
        assignee: assigneeEmail,
        dueDate: task.due_date,
        kind,
      });
      continue;
    }

    const lockKey = buildExecutionKey(task.id, kind);
    const { error: lockError } = await supabaseAdmin.from("automation_execution_locks").insert({
      job_name: "task_reminders",
      lock_key: lockKey,
      lead_id: task.lead_id,
      window_start: task.due_date,
      metadata: {
        task_id: task.id,
        kind,
      },
    });

    if (lockError) {
      if (lockError.code === "23505") {
        skippedDuplicate += 1;
        continue;
      }
      failed += 1;
      continue;
    }

    const subject =
      kind === "overdue"
        ? `Task overdue reminder: ${task.title}`
        : `Upcoming task reminder: ${task.title}`;

    const body = [
      `Hello,`,
      ``,
      `This is an automatic CRM reminder for your task: ${task.title}`,
      `Due date: ${new Date(task.due_date).toLocaleString()}`,
      `Priority: ${task.priority}`,
      task.description ? `Description: ${task.description}` : null,
      ``,
      `Please update it in CRM as soon as possible.`,
    ]
      .filter(Boolean)
      .join("\n");

    const emailSend = await sendBrevoEmail({
      toEmail: assigneeEmail,
      subject,
      text: body,
    });

    const status = emailSend.ok ? "sent" : "failed";
    if (emailSend.ok) sent += 1;
    else failed += 1;

    await supabaseAdmin.from("email_logs").insert({
      lead_id: task.lead_id,
      contact_id: null,
      template_id: null,
      recipient_email: assigneeEmail,
      subject,
      body,
      status,
      provider_message_id: emailSend.ok ? emailSend.messageId ?? null : null,
      error_message: emailSend.ok ? null : emailSend.error ?? "Task reminder send failed",
      sent_at: emailSend.ok ? new Date().toISOString() : null,
    });
  }

  return ok({
    dryRun,
    processed: tasks.length,
    eligible,
    sent,
    failed,
    skippedDuplicate,
    previews: previews.slice(0, 30),
  });
}
