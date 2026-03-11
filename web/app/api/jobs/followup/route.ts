import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { sendBrevoEmail } from "@/lib/brevo";
import { env } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RunnerContext = {
  isCron: boolean;
  userId: string | null;
};

async function resolveRunner(request: Request): Promise<RunnerContext | null> {
  const cronSecret = request.headers.get("x-cron-secret");
  if (env.cronSecret && cronSecret === env.cronSecret) {
    return { isCron: true, userId: null };
  }

  const auth = await requireAuthenticatedUser();
  if (auth.response) return null;
  const role = await getUserRole(auth.user!.id);
  if (role !== "admin") return null;
  return { isCron: false, userId: auth.user!.id };
}

function buildExecutionKey(leadId: string, pivotDate: string) {
  return `followup:${leadId}:${pivotDate}`;
}

export async function POST(request: Request) {
  const runner = await resolveRunner(request);
  if (!runner) return fail("Unauthorized to run followup job", 401);

  const requestUrl = new URL(request.url);
  const dryRun = requestUrl.searchParams.get("dry_run") === "true";

  const quoteSentStageNames = ["Quote Sent", "Devis envoye"];
  const { data: stage } = await supabaseAdmin
    .from("pipeline_stages")
    .select("id,name")
    .in("name", quoteSentStageNames)
    .limit(1)
    .single();

  if (!stage) return fail("Missing pipeline stage: Quote Sent / Devis envoye", 400);

  const threshold = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data: leads, error: leadsError } = await supabaseAdmin
    .from("leads")
    .select("id,title,contact_id,updated_at,created_at")
    .eq("current_stage_id", stage.id)
    .eq("status", "open")
    .lt("updated_at", threshold)
    .limit(200);

  if (leadsError) return fail("Failed to load leads for followup", 500, leadsError.message);
  if (!leads || leads.length === 0) {
    return ok({ dryRun, processed: 0, eligible: 0, sent: 0, failed: 0, skippedDuplicate: 0 });
  }

  const { data: template } = await supabaseAdmin
    .from("email_templates")
    .select("id,subject,body")
    .eq("event_type", "followup")
    .eq("is_active", true)
    .single();

  const subject = template?.subject ?? "Quote follow-up";
  const bodyTpl =
    template?.body ??
    "Hello {{name}},\n\nWe are following up on your quote. Please let us know if you have any questions.\n\nBest regards.";

  let eligible = 0;
  let sent = 0;
  let failed = 0;
  let skippedDuplicate = 0;
  const previews: Array<{
    leadId: string;
    leadTitle: string;
    contactEmail: string;
    subject: string;
  }> = [];

  for (const lead of leads) {
    if (!lead.contact_id) {
      failed += 1;
      continue;
    }

    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id,first_name,last_name,email")
      .eq("id", lead.contact_id)
      .single();

    if (!contact?.email) {
      failed += 1;
      continue;
    }

    eligible += 1;

    const name = `${contact.first_name} ${contact.last_name}`.trim() || "Client";
    const body = bodyTpl.replaceAll("{{name}}", name);

    if (dryRun) {
      previews.push({
        leadId: lead.id,
        leadTitle: lead.title,
        contactEmail: contact.email,
        subject,
      });
      continue;
    }

    const lockKey = buildExecutionKey(lead.id, lead.updated_at ?? lead.created_at);
    const { error: lockError } = await supabaseAdmin.from("automation_execution_locks").insert({
      job_name: "followup_72h",
      lock_key: lockKey,
      lead_id: lead.id,
      window_start: lead.updated_at,
      metadata: {
        stage: stage.name,
        contact_id: contact.id,
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

    const send = await sendBrevoEmail({
      toEmail: contact.email,
      toName: name,
      subject,
      text: body,
    });

    const status = send.ok ? "sent" : "failed";
    if (send.ok) sent += 1;
    else failed += 1;

    await supabaseAdmin.from("email_logs").insert({
      lead_id: lead.id,
      contact_id: contact.id,
      template_id: template?.id ?? null,
      sender_user_id: runner.userId,
      recipient_email: contact.email,
      subject,
      body,
      status,
      provider_message_id: send.ok ? send.messageId ?? null : null,
      error_message: send.ok ? null : send.error ?? "Email send failed",
      sent_at: send.ok ? new Date().toISOString() : null,
    });
  }

  return ok({
    dryRun,
    processed: leads.length,
    eligible,
    sent,
    failed,
    skippedDuplicate,
    previews: previews.slice(0, 25),
  });
}
