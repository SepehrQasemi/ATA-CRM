import { requireAuthenticatedUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { buildDashboardCsvReport, buildDashboardPdfReport } from "@/lib/report-export";

type DashboardPayload = {
  range: "7d" | "30d" | "90d";
  kpis: {
    totalLeads: number;
    wonLeads: number;
    lostLeads: number;
    conversionRate: number;
    pipelineValue: number;
    overdueTasks: number;
    dueSoonTasks: number;
    emailsSent: number;
    emailOpenRate: number;
    emailClickRate: number;
  };
  stageMetrics: Array<{
    stageId: string;
    stageName: string;
    count: number;
    value: number;
  }>;
  leadsBySource: Array<{ source: string; count: number }>;
  leaderboard: Array<{ userId: string; name: string; amount: number }>;
  error?: string;
};

function parseRange(raw: string | null) {
  if (raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "30d";
}

function parseFormat(raw: string | null) {
  if (raw === "pdf" || raw === "csv") return raw;
  return "csv";
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const format = parseFormat(url.searchParams.get("format"));
  const range = parseRange(url.searchParams.get("range"));

  const dashboardUrl = new URL("/api/dashboard", url.origin);
  dashboardUrl.searchParams.set("range", range);

  const dashboardRes = await fetch(dashboardUrl.toString(), {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const dashboardJson = (await dashboardRes.json()) as DashboardPayload;
  if (!dashboardRes.ok) {
    return fail(dashboardJson.error ?? "Failed to load dashboard data for export", dashboardRes.status);
  }

  const filenameBase = `crm-dashboard-${range}-${new Date().toISOString().slice(0, 10)}`;
  if (format === "csv") {
    const csv = buildDashboardCsvReport(dashboardJson);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filenameBase}.csv\"`,
      },
    });
  }

  const pdf = buildDashboardPdfReport(dashboardJson);
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${filenameBase}.pdf\"`,
    },
  });
}
