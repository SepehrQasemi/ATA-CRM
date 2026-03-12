"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { roleLabel } from "@/lib/i18n";

type Colleague = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position: string | null;
  phone: string | null;
  department: string | null;
  role: string | null;
};

type ColleagueResponse = {
  actorRole: string;
  colleagues: Colleague[];
};

function displayName(colleague: Colleague): string {
  const direct = colleague.full_name?.trim();
  if (direct) return direct;

  const combined = [colleague.first_name, colleague.last_name].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return colleague.id.slice(0, 8);
}

export default function ColleaguesPage() {
  const { tr, locale } = useLocale();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);

  useEffect(() => {
    async function loadColleagues() {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/colleagues", { cache: "no-store" });
      const json = (await response.json()) as ColleagueResponse & { error?: string };

      if (!response.ok) {
        setError(json.error ?? tr("Failed to load colleagues"));
        setLoading(false);
        return;
      }

      setColleagues(json.colleagues ?? []);
      setLoading(false);
    }

    void loadColleagues();
  }, [tr]);

  const filtered = useMemo(() => {
    const value = q.trim().toLowerCase();
    if (!value) return colleagues;

    return colleagues.filter((row) => {
      const haystacks = [
        displayName(row),
        row.email ?? "",
        row.position ?? "",
        row.department ?? "",
        row.role ?? "",
      ];
      return haystacks.some((entry) => entry.toLowerCase().includes(value));
    });
  }, [colleagues, q]);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Colleagues")}</h1>
        <p>{tr("Browse team directory and internal profiles.")}</p>
      </section>

      {loading ? <p className="small">{tr("Loading data...")}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <label className="stack col-6">
          {tr("Search")}
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={tr("Name or email")}
          />
        </label>
      </section>

      <section className="panel stack">
        <h2>{tr("Colleague list")}</h2>
        <div className="table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>{tr("Name")}</th>
                <th>{tr("Position")}</th>
                <th>{tr("Email")}</th>
                <th>{tr("Department")}</th>
                <th>{tr("Role")}</th>
                <th>{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{displayName(row)}</td>
                  <td>{row.position ?? "-"}</td>
                  <td>{row.email ?? "-"}</td>
                  <td>{row.department ?? "-"}</td>
                  <td>{row.role ? roleLabel(row.role, locale) : "-"}</td>
                  <td>
                    <Link className="btn btn-secondary" href={`/colleagues/${row.id}`}>
                      {tr("View profile")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !error && filtered.length === 0 ? <p className="small">{tr("No data found.")}</p> : null}
      </section>
    </div>
  );
}
