"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type MetaResponse = {
  profiles: Array<{ id: string; full_name: string | null; role: string }>;
  stages: Array<{ id: string; name: string; sort_order: number; is_closed: boolean }>;
  templates: Array<{ id: string; name: string; event_type: string; subject: string; is_active: boolean }>;
};

export default function SettingsPage() {
  const { tr } = useLocale();
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      const response = await fetch("/api/meta");
      const json = (await response.json()) as MetaResponse & { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Failed to load settings");
        return;
      }
      setMeta(json);
    }
    void loadMeta();
  }, []);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Settings")}</h1>
        <p>{tr("Quick view of CRM setup, roles, and automations.")}</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>{tr("Configured pipeline")}</h2>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Stage</th>
              <th>Closed</th>
            </tr>
          </thead>
          <tbody>
            {(meta?.stages ?? []).map((stage) => (
              <tr key={stage.id}>
                <td>{stage.sort_order}</td>
                <td>{stage.name}</td>
                <td>{stage.is_closed ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{tr("Email templates")}</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {(meta?.templates ?? []).map((template) => (
              <tr key={template.id}>
                <td>{template.name}</td>
                <td>{template.event_type}</td>
                <td>{template.subject}</td>
                <td>{template.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{tr("Team roles")}</h2>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {(meta?.profiles ?? []).map((profile) => (
              <tr key={profile.id}>
                <td>{profile.full_name ?? profile.id.slice(0, 8)}</td>
                <td>{profile.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
