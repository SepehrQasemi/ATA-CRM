import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RangeKey = "7d" | "30d" | "90d";

function ownershipFilter(userId: string) {
  return `owner_id.eq.${userId},assigned_to.eq.${userId}`;
}

function parseRange(value: string | null): RangeKey {
  if (value === "7d" || value === "30d" || value === "90d") {
    return value;
  }
  return "30d";
}

function daysFromRange(range: RangeKey) {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("range"));
  const rangeDays = daysFromRange(range);
  const cutoff = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const leadsQuery = supabaseAdmin
    .from("leads")
    .select("id,status,current_stage_id,estimated_value,owner_id,assigned_to,source,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    leadsQuery.or(ownershipFilter(user.id));
  }

  const tasksQuery = supabaseAdmin
    .from("tasks")
    .select("id,status,due_date,owner_id,assigned_to,created_at")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    tasksQuery.or(ownershipFilter(user.id));
  }

  const profilesQuery = supabaseAdmin
    .from("profiles")
    .select("id,full_name")
    .order("full_name", { ascending: true });

  const stagesQuery = supabaseAdmin
    .from("pipeline_stages")
    .select("id,name,sort_order")
    .order("sort_order", { ascending: true });

  const historyQuery = supabaseAdmin
    .from("lead_stage_history")
    .select("lead_id,to_stage_id,changed_at")
    .order("changed_at", { ascending: false })
    .limit(3000);

  const [
    { data: leads, error: leadsError },
    { data: tasks, error: tasksError },
    { data: profiles },
    { data: stages },
    { data: history, error: historyError },
  ] = await Promise.all([leadsQuery, tasksQuery, profilesQuery, stagesQuery, historyQuery]);

  if (leadsError) return fail("Failed to load leads", 500, leadsError.message);
  if (tasksError) return fail("Failed to load tasks", 500, tasksError.message);
  if (historyError) return fail("Failed to load stage history", 500, historyError.message);

  const visibleLeads = leads ?? [];
  const rangeLeads = visibleLeads.filter((lead) => lead.created_at >= cutoff);

  const visibleTasks = tasks ?? [];
  const rangeTasks = visibleTasks.filter((task) => task.created_at >= cutoff);

  let visibleLeadIds: string[] | null = null;
  if (!isAdmin) {
    visibleLeadIds = visibleLeads.map((lead) => lead.id);
  }

  const emailsQuery = supabaseAdmin
    .from("email_logs")
    .select("id,status,created_at,lead_id")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!isAdmin) {
    if (!visibleLeadIds || visibleLeadIds.length === 0) {
      return ok({
        range,
        kpis: {
          totalLeads: rangeLeads.length,
          wonLeads: 0,
          lostLeads: 0,
          conversionRate: 0,
          pipelineValue: 0,
          overdueTasks: 0,
          emailsSent: 0,
        },
        stageMetrics: [],
        funnel: {
          stages: [],
          conversionChain: [],
        },
        leadsBySource: [],
        salesByCommercial: [],
        stageAging: [],
        leaderboard: [],
      });
    }
    emailsQuery.in("lead_id", visibleLeadIds);
  }

  const { data: emails, error: emailsError } = await emailsQuery;
  if (emailsError) return fail("Failed to load email logs", 500, emailsError.message);

  const totalLeads = rangeLeads.length;
  const wonLeadsList = rangeLeads.filter((lead) => lead.status === "won");
  const wonLeads = wonLeadsList.length;
  const lostLeads = rangeLeads.filter((lead) => lead.status === "lost").length;
  const conversionRate =
    totalLeads === 0 ? 0 : Number(((wonLeads / totalLeads) * 100).toFixed(2));

  const pipelineValue = rangeLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0,
  );

  const nowMs = Date.now();
  const overdueTasks = rangeTasks.filter((task) => {
    if (task.status === "done" || !task.due_date) return false;
    return new Date(task.due_date).getTime() < nowMs;
  }).length;

  const emailsSent = (emails ?? []).filter((email) => email.status === "sent").length;

  const stageCounts: Record<string, number> = {};
  const stageValues: Record<string, number> = {};

  rangeLeads.forEach((lead) => {
    if (!lead.current_stage_id) return;
    stageCounts[lead.current_stage_id] = (stageCounts[lead.current_stage_id] ?? 0) + 1;
    stageValues[lead.current_stage_id] =
      (stageValues[lead.current_stage_id] ?? 0) + Number(lead.estimated_value || 0);
  });

  const orderedStages = stages ?? [];
  const stageMetrics = orderedStages.map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    count: stageCounts[stage.id] ?? 0,
    value: stageValues[stage.id] ?? 0,
  }));

  const funnelStages = stageMetrics.map((metric) => ({
    stageId: metric.stageId,
    stageName: metric.stageName,
    count: metric.count,
  }));

  const conversionChain = orderedStages.slice(0, -1).map((stage, index) => {
    const currentCount = stageCounts[stage.id] ?? 0;
    const nextStage = orderedStages[index + 1];
    const nextCount = stageCounts[nextStage.id] ?? 0;
    const rate = currentCount === 0 ? 0 : Number(((nextCount / currentCount) * 100).toFixed(2));

    return {
      fromStageId: stage.id,
      fromStageName: stage.name,
      toStageId: nextStage.id,
      toStageName: nextStage.name,
      rate,
    };
  });

  const leadsBySourceMap: Record<string, number> = {};
  rangeLeads.forEach((lead) => {
    const key = lead.source?.trim() || "Unknown";
    leadsBySourceMap[key] = (leadsBySourceMap[key] ?? 0) + 1;
  });

  const leadsBySource = Object.entries(leadsBySourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const wonByCommercial: Record<string, number> = {};
  wonLeadsList.forEach((lead) => {
    if (!lead.assigned_to) return;
    wonByCommercial[lead.assigned_to] =
      (wonByCommercial[lead.assigned_to] ?? 0) + Number(lead.estimated_value || 0);
  });

  const salesByCommercial = Object.entries(wonByCommercial)
    .map(([userId, amount]) => ({
      userId,
      amount,
      name: profiles?.find((profile) => profile.id === userId)?.full_name ?? "Commercial",
    }))
    .sort((a, b) => b.amount - a.amount);

  const leaderboard = salesByCommercial.slice(0, 5);

  const stageEntryByLead: Record<string, Record<string, string>> = {};
  (history ?? []).forEach((row) => {
    if (!stageEntryByLead[row.lead_id]) {
      stageEntryByLead[row.lead_id] = {};
    }
    if (!stageEntryByLead[row.lead_id][row.to_stage_id]) {
      stageEntryByLead[row.lead_id][row.to_stage_id] = row.changed_at;
    }
  });

  const agingBuckets: Record<string, { totalDays: number; count: number }> = {};
  rangeLeads.forEach((lead) => {
    if (!lead.current_stage_id) return;

    const enteredAt =
      stageEntryByLead[lead.id]?.[lead.current_stage_id] ?? lead.updated_at ?? lead.created_at;

    const ageDays = Math.max(
      0,
      (Date.now() - new Date(enteredAt).getTime()) / (24 * 60 * 60 * 1000),
    );

    if (!agingBuckets[lead.current_stage_id]) {
      agingBuckets[lead.current_stage_id] = { totalDays: 0, count: 0 };
    }

    agingBuckets[lead.current_stage_id].totalDays += ageDays;
    agingBuckets[lead.current_stage_id].count += 1;
  });

  const stageAging = orderedStages
    .map((stage) => {
      const bucket = agingBuckets[stage.id];
      if (!bucket || bucket.count === 0) {
        return {
          stageId: stage.id,
          stageName: stage.name,
          avgDays: 0,
        };
      }

      return {
        stageId: stage.id,
        stageName: stage.name,
        avgDays: Number((bucket.totalDays / bucket.count).toFixed(2)),
      };
    })
    .filter((entry) => entry.avgDays > 0);

  return ok({
    range,
    kpis: {
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      pipelineValue,
      overdueTasks,
      emailsSent,
    },
    stageMetrics,
    funnel: {
      stages: funnelStages,
      conversionChain,
    },
    leadsBySource,
    salesByCommercial,
    stageAging,
    leaderboard,
  });
}