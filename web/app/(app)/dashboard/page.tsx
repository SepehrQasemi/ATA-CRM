"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { PageTip } from "@/components/page-tip";

type RangeKey = "7d" | "30d" | "90d";

type DashboardResponse = {
  range: RangeKey;
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
  stageMetrics: Array<{ stageId: string; stageName: string; count: number; value: number }>;
  funnel: {
    stages: Array<{ stageId: string; stageName: string; count: number }>;
    conversionChain: Array<{
      fromStageId: string;
      fromStageName: string;
      toStageId: string;
      toStageName: string;
      rate: number;
    }>;
  };
  leadsBySource: Array<{ source: string; count: number }>;
  salesByCommercial: Array<{ userId: string; name: string; amount: number }>;
  stageAging: Array<{ stageId: string; stageName: string; avgDays: number }>;
  leaderboard: Array<{ userId: string; amount: number; name: string }>;
  deadlineAlerts: Array<{
    taskId: string;
    title: string;
    priority: string;
    status: string;
    dueDate: string;
    kind: "overdue" | "due_soon";
  }>;
  error?: string;
};

export default function DashboardPage() {
  const { tr } = useLocale();
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  async function loadDashboard(nextRange: RangeKey) {
    setError(null);
    setLoading(true);

    const response = await fetch(`/api/dashboard?range=${nextRange}`);
    const json = (await response.json()) as DashboardResponse;

    if (!response.ok) {
      setError(json.error ?? "Failed to load dashboard");
      setLoading(false);
      return;
    }

    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard(range);
  }, [range]);

  async function handleExport(format: "csv" | "pdf") {
    setExporting(format);
    setError(null);

    const response = await fetch(`/api/exports/report?format=${format}&range=${range}`);
    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? `Failed to export ${format.toUpperCase()}`);
      setExporting(null);
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `crm-dashboard-${range}.${format}`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);

    setExporting(null);
  }

  return (
    <div className="stack">
      <PageTip
        id="tip-dashboard-overview"
        title={tr("Quick onboarding")}
        detail={tr("Use 30 days KPI, then review funnel and export CSV/PDF for your demo story.")}
      />
      <section className="page-head">
        <h1>{tr("Dashboard")}</h1>
        <p>{tr("Commercial KPIs, funnel, pipeline, and team performance.")}</p>
      </section>

      <section className="panel stack">
        <div className="inline-actions">
          <strong>{tr("KPI period:")}</strong>
          <button
            className={`btn ${range === "7d" ? "btn-primary" : "btn-secondary"}`}
            type="button"
            onClick={() => setRange("7d")}
            disabled={loading}
          >
            {tr("7 days")}
          </button>
          <button
            className={`btn ${range === "30d" ? "btn-primary" : "btn-secondary"}`}
            type="button"
            onClick={() => setRange("30d")}
            disabled={loading}
          >
            {tr("30 days")}
          </button>
          <button
            className={`btn ${range === "90d" ? "btn-primary" : "btn-secondary"}`}
            type="button"
            onClick={() => setRange("90d")}
            disabled={loading}
          >
            {tr("90 days")}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => void handleExport("csv")}
            disabled={loading || exporting !== null}
          >
            {exporting === "csv" ? tr("Exporting CSV...") : tr("Export CSV")}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => void handleExport("pdf")}
            disabled={loading || exporting !== null}
          >
            {exporting === "pdf" ? tr("Exporting PDF...") : tr("Export PDF")}
          </button>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="card-grid card-grid-wide">
        <article className="card">
          <p className="muted">{tr("Total leads")}</p>
          <p className="kpi">{data?.kpis.totalLeads ?? 0}</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Won / Lost")}</p>
          <p className="kpi">
            {data?.kpis.wonLeads ?? 0} / {data?.kpis.lostLeads ?? 0}
          </p>
        </article>
        <article className="card">
          <p className="muted">{tr("Conversion")}</p>
          <p className="kpi">{data?.kpis.conversionRate ?? 0}%</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Pipeline value")}</p>
          <p className="kpi">{(data?.kpis.pipelineValue ?? 0).toLocaleString()} EUR</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Overdue tasks")}</p>
          <p className="kpi">{data?.kpis.overdueTasks ?? 0}</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Due in 24h")}</p>
          <p className="kpi">{data?.kpis.dueSoonTasks ?? 0}</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Sent emails")}</p>
          <p className="kpi">{data?.kpis.emailsSent ?? 0}</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Email open rate")}</p>
          <p className="kpi">{data?.kpis.emailOpenRate ?? 0}%</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Email click rate")}</p>
          <p className="kpi">{data?.kpis.emailClickRate ?? 0}%</p>
        </article>
      </section>

      <section className="panel stack">
        <h2>{tr("Deadline notifications")}</h2>
        <table>
          <thead>
            <tr>
              <th>Alert</th>
              <th>Task</th>
              <th>Priority</th>
              <th>Due date</th>
            </tr>
          </thead>
          <tbody>
            {(data?.deadlineAlerts ?? []).length === 0 ? (
              <tr>
                <td colSpan={4}>{tr("No urgent deadline alerts")}</td>
              </tr>
            ) : (
              (data?.deadlineAlerts ?? []).map((alert) => (
                <tr key={alert.taskId}>
                  <td>{alert.kind === "overdue" ? tr("Overdue") : tr("Due soon")}</td>
                  <td>{alert.title}</td>
                  <td>{alert.priority}</td>
                  <td>{new Date(alert.dueDate).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{tr("Pipeline by stage (count + value)")}</h2>
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Leads</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {(data?.stageMetrics ?? []).map((stage) => (
              <tr key={stage.stageId}>
                <td>{stage.stageName}</td>
                <td>{stage.count}</td>
                <td>{stage.value.toLocaleString()} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{tr("Funnel conversion chain")}</h2>
        <table>
          <thead>
            <tr>
              <th>Transition</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {(data?.funnel.conversionChain ?? []).map((entry) => (
              <tr key={`${entry.fromStageId}-${entry.toStageId}`}>
                <td>
                  {entry.fromStageName} -&gt; {entry.toStageName}
                </td>
                <td>{entry.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{tr("Leads by source")}</h2>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Leads</th>
            </tr>
          </thead>
          <tbody>
            {(data?.leadsBySource ?? []).map((entry) => (
              <tr key={entry.source}>
                <td>{entry.source}</td>
                <td>{entry.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{tr("Stage aging (average days)")}</h2>
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Avg days</th>
            </tr>
          </thead>
          <tbody>
            {(data?.stageAging ?? []).map((entry) => (
              <tr key={entry.stageId}>
                <td>{entry.stageName}</td>
                <td>{entry.avgDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{tr("Sales leaderboard (won leads value)")}</h2>
        <table>
          <thead>
            <tr>
              <th>Sales Rep</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data?.leaderboard ?? []).map((entry) => (
              <tr key={entry.userId}>
                <td>{entry.name}</td>
                <td>{entry.amount.toLocaleString()} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
