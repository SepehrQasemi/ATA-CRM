import { env } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { normalizeStageName } from "@/lib/pipeline-stage-labels";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RangeKey = "7d" | "30d" | "90d";

function parseRange(raw: string | null): RangeKey {
  if (raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "30d";
}

function daysFromRange(range: RangeKey) {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

function isAuthorized(request: Request, url: URL) {
  if (!env.biApiKey) return false;
  const query = url.searchParams.get("api_key");
  const header = request.headers.get("x-api-key");
  return query === env.biApiKey || header === env.biApiKey;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isAuthorized(request, url)) {
    return fail("Unauthorized BI request", 401);
  }

  const range = parseRange(url.searchParams.get("range"));
  const cutoff = new Date(Date.now() - daysFromRange(range) * 24 * 60 * 60 * 1000).toISOString();

  const [leadsRes, tasksRes, emailsRes, stagesRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id,status,current_stage_id,estimated_value,source,assigned_to,created_at")
      .gte("created_at", cutoff),
    supabaseAdmin
      .from("tasks")
      .select("id,status,due_date,created_at")
      .gte("created_at", cutoff),
    supabaseAdmin
      .from("email_logs")
      .select("id,status,open_count,click_count,created_at")
      .gte("created_at", cutoff),
    supabaseAdmin.from("pipeline_stages").select("id,name,sort_order").order("sort_order", { ascending: true }),
    supabaseAdmin.from("profiles").select("id,full_name"),
  ]);

  if (leadsRes.error) return fail("Failed to load leads for BI export", 500, leadsRes.error.message);
  if (tasksRes.error) return fail("Failed to load tasks for BI export", 500, tasksRes.error.message);
  if (emailsRes.error) return fail("Failed to load emails for BI export", 500, emailsRes.error.message);
  if (stagesRes.error) return fail("Failed to load stages for BI export", 500, stagesRes.error.message);
  if (profilesRes.error) return fail("Failed to load profiles for BI export", 500, profilesRes.error.message);

  const leads = leadsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const emails = emailsRes.data ?? [];
  const stages = stagesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const nowMs = Date.now();
  const dueSoonCutoffMs = Date.now() + 24 * 60 * 60 * 1000;

  const totalLeads = leads.length;
  const wonLeads = leads.filter((lead) => lead.status === "won");
  const lostLeads = leads.filter((lead) => lead.status === "lost");
  const conversionRate =
    totalLeads === 0 ? 0 : Number(((wonLeads.length / totalLeads) * 100).toFixed(2));
  const pipelineValue = leads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);

  const overdueTasks = tasks.filter((task) => {
    if (task.status === "done" || !task.due_date) return false;
    return new Date(task.due_date).getTime() < nowMs;
  }).length;

  const dueSoonTasks = tasks.filter((task) => {
    if (task.status === "done" || !task.due_date) return false;
    const dueMs = new Date(task.due_date).getTime();
    return dueMs >= nowMs && dueMs <= dueSoonCutoffMs;
  }).length;

  const sentEmails = emails.filter((email) => email.status === "sent");
  const openedEmails = sentEmails.filter((email) => Number(email.open_count || 0) > 0).length;
  const clickedEmails = sentEmails.filter((email) => Number(email.click_count || 0) > 0).length;
  const emailOpenRate =
    sentEmails.length === 0 ? 0 : Number(((openedEmails / sentEmails.length) * 100).toFixed(2));
  const emailClickRate =
    sentEmails.length === 0 ? 0 : Number(((clickedEmails / sentEmails.length) * 100).toFixed(2));

  const stageCounts: Record<string, number> = {};
  const stageValues: Record<string, number> = {};
  for (const lead of leads) {
    if (!lead.current_stage_id) continue;
    stageCounts[lead.current_stage_id] = (stageCounts[lead.current_stage_id] ?? 0) + 1;
    stageValues[lead.current_stage_id] =
      (stageValues[lead.current_stage_id] ?? 0) + Number(lead.estimated_value || 0);
  }

  const stageMetrics = stages.map((stage) => ({
    stageId: stage.id,
    stageName: normalizeStageName(stage.name),
    count: stageCounts[stage.id] ?? 0,
    value: stageValues[stage.id] ?? 0,
  }));

  const leadsBySourceMap: Record<string, number> = {};
  for (const lead of leads) {
    const source = lead.source?.trim() || "Unknown";
    leadsBySourceMap[source] = (leadsBySourceMap[source] ?? 0) + 1;
  }
  const leadsBySource = Object.entries(leadsBySourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const wonByCommercial: Record<string, number> = {};
  for (const lead of wonLeads) {
    if (!lead.assigned_to) continue;
    wonByCommercial[lead.assigned_to] =
      (wonByCommercial[lead.assigned_to] ?? 0) + Number(lead.estimated_value || 0);
  }
  const salesByCommercial = Object.entries(wonByCommercial)
    .map(([userId, amount]) => ({
      userId,
      name: profiles.find((profile) => profile.id === userId)?.full_name ?? "Sales Rep",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return ok({
    generatedAt: new Date().toISOString(),
    range,
    kpis: {
      totalLeads,
      wonLeads: wonLeads.length,
      lostLeads: lostLeads.length,
      conversionRate,
      pipelineValue,
      overdueTasks,
      dueSoonTasks,
      emailsSent: sentEmails.length,
      emailOpenRate,
      emailClickRate,
    },
    stageMetrics,
    leadsBySource,
    salesByCommercial,
  });
}
