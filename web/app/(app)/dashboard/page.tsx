"use client";

import { useEffect, useState } from "react";

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
    emailsSent: number;
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
  error?: string;
};

export default function DashboardPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Dashboard</h1>
        <p>KPIs commerciaux, funnel, pipeline et performance de l equipe.</p>
      </section>

      <section className="panel stack">
        <div className="inline-actions">
          <strong>Periode KPI:</strong>
          <button
            className={`btn ${range === "7d" ? "btn-primary" : "btn-secondary"}`}
            type="button"
            onClick={() => setRange("7d")}
            disabled={loading}
          >
            7 days
          </button>
          <button
            className={`btn ${range === "30d" ? "btn-primary" : "btn-secondary"}`}
            type="button"
            onClick={() => setRange("30d")}
            disabled={loading}
          >
            30 days
          </button>
          <button
            className={`btn ${range === "90d" ? "btn-primary" : "btn-secondary"}`}
            type="button"
            onClick={() => setRange("90d")}
            disabled={loading}
          >
            90 days
          </button>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="card-grid card-grid-wide">
        <article className="card">
          <p className="muted">Total leads</p>
          <p className="kpi">{data?.kpis.totalLeads ?? 0}</p>
        </article>
        <article className="card">
          <p className="muted">Won / Lost</p>
          <p className="kpi">
            {data?.kpis.wonLeads ?? 0} / {data?.kpis.lostLeads ?? 0}
          </p>
        </article>
        <article className="card">
          <p className="muted">Conversion</p>
          <p className="kpi">{data?.kpis.conversionRate ?? 0}%</p>
        </article>
        <article className="card">
          <p className="muted">Pipeline value</p>
          <p className="kpi">{(data?.kpis.pipelineValue ?? 0).toLocaleString()} EUR</p>
        </article>
        <article className="card">
          <p className="muted">Overdue tasks</p>
          <p className="kpi">{data?.kpis.overdueTasks ?? 0}</p>
        </article>
        <article className="card">
          <p className="muted">Sent emails</p>
          <p className="kpi">{data?.kpis.emailsSent ?? 0}</p>
        </article>
      </section>

      <section className="panel stack">
        <h2>Pipeline par etape (count + value)</h2>
        <table>
          <thead>
            <tr>
              <th>Etape</th>
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
        <h2>Funnel conversion chain</h2>
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
        <h2>Leads by source</h2>
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
        <h2>Stage aging (average days)</h2>
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
        <h2>Leaderboard commerciaux (won leads value)</h2>
        <table>
          <thead>
            <tr>
              <th>Commercial</th>
              <th>Montant</th>
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