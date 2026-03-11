import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import {
  getLeadSuccessProbability,
  normalizeStageName,
} from "@/lib/pipeline-stage-labels";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RangeKey = "7d" | "30d" | "90d";
type ScopeKey = "own" | "team";

function ownershipFilter(userId: string) {
  return `owner_id.eq.${userId},assigned_to.eq.${userId}`;
}

function parseRange(value: string | null): RangeKey {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}

function parseScope(value: string | null): ScopeKey {
  if (value === "team") return "team";
  return "own";
}

function daysFromRange(range: RangeKey) {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

function canViewTeamScope(role: string) {
  return role === "admin" || role === "manager";
}

function stageOffsetDays(probability: number) {
  if (probability <= 0 || probability >= 100) return 0;
  if (probability >= 70) return 15;
  if (probability >= 50) return 30;
  if (probability >= 30) return 45;
  if (probability >= 20) return 60;
  return 90;
}

function monthKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map((item) => Number(item));
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function resolveForecastDate(lead: {
  last_activity_at: string | null;
  updated_at: string;
  created_at: string;
  status: string;
}) {
  if (lead.status === "won" || lead.status === "lost") {
    return new Date(lead.updated_at ?? lead.created_at);
  }
  return null;
}

type EmptyStateArgs = {
  range: RangeKey;
  scope: ScopeKey;
  availableScopes: ScopeKey[];
  deadlineAlerts: Array<{
    taskId: string;
    title: string;
    priority: string;
    status: string;
    dueDate: string;
    kind: "overdue" | "due_soon";
  }>;
  overdueTasks: number;
  dueSoonTasks: number;
};

function buildEmptyDashboardResponse(args: EmptyStateArgs) {
  return {
    range: args.range,
    scope: args.scope,
    availableScopes: args.availableScopes,
    kpis: {
      totalLeads: 0,
      wonLeads: 0,
      lostLeads: 0,
      conversionRate: 0,
      pipelineValue: 0,
      weightedPipelineValue: 0,
      overdueTasks: args.overdueTasks,
      dueSoonTasks: args.dueSoonTasks,
      emailsSent: 0,
      emailOpenRate: 0,
      emailClickRate: 0,
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
    forecastCalendar: [],
    deadlineAlerts: args.deadlineAlerts,
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("range"));
  const requestedScope = parseScope(url.searchParams.get("scope"));
  const rangeDays = daysFromRange(range);
  const cutoff = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  const role = await getUserRole(user.id);
  const allowedScopes: ScopeKey[] = canViewTeamScope(role) ? ["own", "team"] : ["own"];
  const scope: ScopeKey = allowedScopes.includes(requestedScope) ? requestedScope : "own";

  const leadsQuery = supabaseAdmin
    .from("leads")
    .select(
      "id,status,current_stage_id,estimated_value,last_activity_at,owner_id,assigned_to,source,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  const tasksQuery = supabaseAdmin
    .from("tasks")
    .select("id,title,status,priority,due_date,owner_id,assigned_to,created_at")
    .order("created_at", { ascending: false });

  if (scope === "own") {
    leadsQuery.or(ownershipFilter(user.id));
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

  const nowMs = Date.now();
  const dueSoonCutoffMs = nowMs + 24 * 60 * 60 * 1000;
  const dueSoonTasks = visibleTasks.filter((task) => {
    if (task.status === "done" || !task.due_date) return false;
    const dueMs = new Date(task.due_date).getTime();
    return dueMs >= nowMs && dueMs <= dueSoonCutoffMs;
  }).length;

  const deadlineAlerts = visibleTasks
    .filter((task) => task.status !== "done" && !!task.due_date)
    .map((task) => {
      const dueMs = new Date(task.due_date as string).getTime();
      const kind = dueMs < nowMs ? "overdue" : dueMs <= dueSoonCutoffMs ? "due_soon" : null;
      return {
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date as string,
        kind,
      };
    })
    .filter((item): item is {
      taskId: string;
      title: string;
      priority: string;
      status: string;
      dueDate: string;
      kind: "overdue" | "due_soon";
    } => item.kind === "overdue" || item.kind === "due_soon")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 20);

  const overdueTasks = rangeTasks.filter((task) => {
    if (task.status === "done" || !task.due_date) return false;
    return new Date(task.due_date).getTime() < nowMs;
  }).length;

  if (visibleLeads.length === 0) {
    return ok(
      buildEmptyDashboardResponse({
        range,
        scope,
        availableScopes: allowedScopes,
        deadlineAlerts,
        overdueTasks,
        dueSoonTasks,
      }),
    );
  }

  const emailsQuery = supabaseAdmin
    .from("email_logs")
    .select("id,status,created_at,lead_id,open_count,click_count")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(500);

  if (scope === "own") {
    emailsQuery.in(
      "lead_id",
      visibleLeads.map((lead) => lead.id),
    );
  }

  const { data: emails, error: emailsError } = await emailsQuery;
  if (emailsError) return fail("Failed to load email logs", 500, emailsError.message);

  const stageNameById = new Map((stages ?? []).map((stage) => [stage.id, normalizeStageName(stage.name)]));

  const weightedPipelineValue = rangeLeads.reduce((sum, lead) => {
    const stageName = lead.current_stage_id ? stageNameById.get(lead.current_stage_id) ?? null : null;
    const probability = getLeadSuccessProbability({
      stageName,
      status: lead.status,
    });
    return sum + Number(lead.estimated_value || 0) * (probability / 100);
  }, 0);

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

  const sentEmailLogs = (emails ?? []).filter((email) => email.status === "sent");
  const emailsSent = sentEmailLogs.length;
  const openedEmails = sentEmailLogs.filter((email) => Number(email.open_count || 0) > 0).length;
  const clickedEmails = sentEmailLogs.filter((email) => Number(email.click_count || 0) > 0).length;
  const emailOpenRate =
    emailsSent === 0 ? 0 : Number(((openedEmails / emailsSent) * 100).toFixed(2));
  const emailClickRate =
    emailsSent === 0 ? 0 : Number(((clickedEmails / emailsSent) * 100).toFixed(2));

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
    stageName: normalizeStageName(stage.name),
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
      fromStageName: normalizeStageName(stage.name),
      toStageId: nextStage.id,
      toStageName: normalizeStageName(nextStage.name),
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
      name: profiles?.find((profile) => profile.id === userId)?.full_name ?? "Sales Rep",
    }))
    .sort((a, b) => b.amount - a.amount);

  const leaderboard = salesByCommercial.slice(0, 5);

  const stageEntryByLead: Record<string, Record<string, string>> = {};
  (history ?? []).forEach((row) => {
    if (!stageEntryByLead[row.lead_id]) stageEntryByLead[row.lead_id] = {};
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
          stageName: normalizeStageName(stage.name),
          avgDays: 0,
        };
      }
      return {
        stageId: stage.id,
        stageName: normalizeStageName(stage.name),
        avgDays: Number((bucket.totalDays / bucket.count).toFixed(2)),
      };
    })
    .filter((entry) => entry.avgDays > 0);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 6);

  const forecastBuckets: Record<
    string,
    { month: string; grossValue: number; weightedValue: number; leadCount: number }
  > = {};
  visibleLeads.forEach((lead) => {
    const stageName = lead.current_stage_id ? stageNameById.get(lead.current_stage_id) ?? null : null;
    const probability = getLeadSuccessProbability({
      stageName,
      status: lead.status,
    });
    const value = Number(lead.estimated_value || 0);
    const resolvedDate = resolveForecastDate(lead);
    const forecastDate =
      resolvedDate ??
      new Date(
        new Date(lead.last_activity_at ?? lead.updated_at ?? lead.created_at).getTime() +
          stageOffsetDays(probability) * 24 * 60 * 60 * 1000,
      );

    if (Number.isNaN(forecastDate.getTime())) return;
    if (forecastDate < monthStart || forecastDate >= monthEnd) return;

    const key = monthKey(forecastDate);
    if (!forecastBuckets[key]) {
      forecastBuckets[key] = { month: key, grossValue: 0, weightedValue: 0, leadCount: 0 };
    }
    forecastBuckets[key].grossValue += value;
    forecastBuckets[key].weightedValue += value * (probability / 100);
    forecastBuckets[key].leadCount += 1;
  });

  const forecastCalendar = Object.values(forecastBuckets)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((bucket) => ({
      month: bucket.month,
      monthLabel: monthLabel(bucket.month),
      leadCount: bucket.leadCount,
      grossValue: Number(bucket.grossValue.toFixed(2)),
      weightedValue: Number(bucket.weightedValue.toFixed(2)),
    }));

  return ok({
    range,
    scope,
    availableScopes: allowedScopes,
    kpis: {
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      pipelineValue: Number(pipelineValue.toFixed(2)),
      weightedPipelineValue: Number(weightedPipelineValue.toFixed(2)),
      overdueTasks,
      dueSoonTasks,
      emailsSent,
      emailOpenRate,
      emailClickRate,
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
    forecastCalendar,
    deadlineAlerts,
  });
}
