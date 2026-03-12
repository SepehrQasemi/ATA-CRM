"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

type ColleagueDetailResponse = {
  actorRole: string;
  colleague: Colleague;
  error?: string;
};

function displayName(colleague: Colleague): string {
  const direct = colleague.full_name?.trim();
  if (direct) return direct;

  const combined = [colleague.first_name, colleague.last_name].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return colleague.id.slice(0, 8);
}

export default function ColleagueProfilePage() {
  const { tr, locale } = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [colleague, setColleague] = useState<Colleague | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadColleague() {
      if (!id) return;

      setLoading(true);
      setError(null);

      const response = await fetch(`/api/colleagues/${id}`, { cache: "no-store" });
      const json = (await response.json()) as ColleagueDetailResponse;

      if (!response.ok || !json.colleague) {
        setError(json.error ?? tr("Failed to load colleague"));
        setLoading(false);
        return;
      }

      setColleague(json.colleague);
      setLoading(false);
    }

    void loadColleague();
  }, [id, tr]);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Colleague profile")}</h1>
        <p>{tr("Browse team directory and internal profiles.")}</p>
      </section>

      <Link className="btn btn-secondary" href="/colleagues">
        {tr("Back to colleagues")}
      </Link>

      {loading ? <p className="small">{tr("Loading data...")}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {colleague ? (
        <section className="panel stack">
          <h2>{displayName(colleague)}</h2>
          <div className="row">
            <div className="stack col-6">
              <p className="small">{tr("Position")}</p>
              <p>{colleague.position ?? "-"}</p>
            </div>
            <div className="stack col-6">
              <p className="small">{tr("Email")}</p>
              <p>{colleague.email ?? "-"}</p>
            </div>
          </div>

          <div className="row">
            <div className="stack col-6">
              <p className="small">{tr("Department")}</p>
              <p>{colleague.department ?? "-"}</p>
            </div>
            <div className="stack col-6">
              <p className="small">{tr("Role")}</p>
              <p>{colleague.role ? roleLabel(colleague.role, locale) : "-"}</p>
            </div>
          </div>

          <div className="row">
            <div className="stack col-6">
              <p className="small">{tr("Phone")}</p>
              <p>{colleague.phone ?? "-"}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
