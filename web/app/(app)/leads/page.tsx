"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Lead, PipelineStage } from "@/lib/types";

type LeadResponse = {
  leads: Lead[];
  stages: PipelineStage[];
  contacts: Array<{ id: string; first_name: string; last_name: string; email: string | null }>;
  companies: Array<{ id: string; name: string }>;
  error?: string;
};

type MetaResponse = {
  profiles: Array<{ id: string; full_name: string | null; role: string }>;
  error?: string;
};

type LeadForm = {
  title: string;
  source: string;
  status: "open" | "won" | "lost";
  estimated_value: string;
  current_stage_id: string;
  contact_id: string;
  company_id: string;
  assigned_to: string;
  notes: string;
};

const initialForm: LeadForm = {
  title: "",
  source: "",
  status: "open",
  estimated_value: "",
  current_stage_id: "",
  contact_id: "",
  company_id: "",
  assigned_to: "",
  notes: "",
};

type LeadFilters = {
  q: string;
  stage_id: string;
  status: string;
  assigned_to: string;
  source: string;
  from: string;
  to: string;
};

const initialFilters: LeadFilters = {
  q: "",
  stage_id: "",
  status: "",
  assigned_to: "",
  source: "",
  from: "",
  to: "",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contacts, setContacts] = useState<LeadResponse["contacts"]>([]);
  const [companies, setCompanies] = useState<LeadResponse["companies"]>([]);
  const [profiles, setProfiles] = useState<MetaResponse["profiles"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [form, setForm] = useState<LeadForm>(initialForm);

  const stageById = useMemo(() => {
    const map: Record<string, PipelineStage> = {};
    stages.forEach((stage) => {
      map[stage.id] = stage;
    });
    return map;
  }, [stages]);

  async function loadData(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.stage_id) params.set("stage_id", activeFilters.stage_id);
    if (activeFilters.status) params.set("status", activeFilters.status);
    if (activeFilters.assigned_to) params.set("assigned_to", activeFilters.assigned_to);
    if (activeFilters.source.trim()) params.set("source", activeFilters.source.trim());
    if (activeFilters.from.trim()) params.set("from", activeFilters.from.trim());
    if (activeFilters.to.trim()) params.set("to", activeFilters.to.trim());

    const leadsUrl = `/api/leads${params.toString() ? `?${params.toString()}` : ""}`;

    const [leadRes, metaRes] = await Promise.all([fetch(leadsUrl), fetch("/api/meta")]);
    const leadJson = (await leadRes.json()) as LeadResponse;
    const metaJson = (await metaRes.json()) as MetaResponse;

    if (!leadRes.ok) {
      setError(leadJson.error ?? "Failed to load leads");
      return;
    }

    if (!metaRes.ok) {
      setError(metaJson.error ?? "Failed to load metadata");
      return;
    }

    setLeads(leadJson.leads ?? []);
    setStages(leadJson.stages ?? []);
    setContacts(leadJson.contacts ?? []);
    setCompanies(leadJson.companies ?? []);
    setProfiles(metaJson.profiles ?? []);

    if (!form.current_stage_id && (leadJson.stages?.length ?? 0) > 0) {
      setForm((prev) => ({ ...prev, current_stage_id: leadJson.stages[0].id }));
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm((prev) => ({
      ...initialForm,
      current_stage_id: stages[0]?.id ?? prev.current_stage_id,
    }));
  }

  async function handleSaveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingId ? `/api/leads/${editingId}` : "/api/leads";
    const method = editingId ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        estimated_value: Number(form.estimated_value || 0),
        contact_id: form.contact_id || null,
        company_id: form.company_id || null,
        assigned_to: form.assigned_to || null,
        current_stage_id: form.current_stage_id || null,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to save lead");
      setSaving(false);
      return;
    }

    setSaving(false);
    resetForm();
    void loadData();
  }

  function startEdit(lead: Lead) {
    setEditingId(lead.id);
    setForm({
      title: lead.title,
      source: lead.source ?? "",
      status: lead.status,
      estimated_value: String(Number(lead.estimated_value || 0)),
      current_stage_id: lead.current_stage_id ?? "",
      contact_id: lead.contact_id ?? "",
      company_id: lead.company_id ?? "",
      assigned_to: lead.assigned_to ?? "",
      notes: lead.notes ?? "",
    });
  }

  async function moveLeadStage(leadId: string, stageId: string, comment = "Manual update") {
    if (!stageId) return;

    const response = await fetch(`/api/leads/${leadId}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId, comment }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to move lead");
      return;
    }
    void loadData();
  }

  async function quickMove(lead: Lead, direction: "prev" | "next") {
    if (!lead.current_stage_id) return;
    const currentIndex = stages.findIndex((stage) => stage.id === lead.current_stage_id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    await moveLeadStage(
      lead.id,
      stages[targetIndex].id,
      direction === "prev" ? "Quick move backward" : "Quick move forward",
    );
  }

  async function deleteLead(leadId: string) {
    const response = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to delete lead");
      return;
    }
    void loadData();
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    void loadData(filters);
  }

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    stages.forEach((stage) => {
      map[stage.id] = [];
    });
    leads.forEach((lead) => {
      if (!lead.current_stage_id) return;
      if (!map[lead.current_stage_id]) map[lead.current_stage_id] = [];
      map[lead.current_stage_id].push(lead);
    });
    return map;
  }, [leads, stages]);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Leads & Pipeline</h1>
        <p>Suivi des prospects, du premier contact a la conversion.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Filtres leads</h2>
        <form className="row" onSubmit={handleFilterSubmit}>
          <label className="col-3 stack">
            Search
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Lead title"
            />
          </label>
          <label className="col-3 stack">
            Stage
            <select
              value={filters.stage_id}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, stage_id: event.target.value }))
              }
            >
              <option value="">All stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col-2 stack">
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </label>
          <label className="col-2 stack">
            Assigned to
            <select
              value={filters.assigned_to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, assigned_to: event.target.value }))
              }
            >
              <option value="">All</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name ?? profile.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label className="col-2 stack">
            Source
            <input
              value={filters.source}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, source: event.target.value }))
              }
              placeholder="LinkedIn"
            />
          </label>
          <label className="col-2 stack">
            Value from
            <input
              type="number"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </label>
          <label className="col-2 stack">
            Value to
            <input
              type="number"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </label>
          <div className="col-2 stack action-end">
            <button className="btn btn-secondary" type="submit">
              Apply filters
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                void loadData(initialFilters);
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>{editingId ? "Edit lead" : "Nouveau lead"}</h2>
        <form className="stack" onSubmit={handleSaveLead}>
          <div className="row">
            <label className="col-3 stack">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              Source
              <input
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="Salon, LinkedIn, Referral"
              />
            </label>
            <label className="col-2 stack">
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as "open" | "won" | "lost",
                  }))
                }
              >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </label>
            <label className="col-2 stack">
              Estimated value
              <input
                type="number"
                value={form.estimated_value}
                onChange={(e) => setForm((prev) => ({ ...prev, estimated_value: e.target.value }))}
              />
            </label>
            <label className="col-2 stack">
              Stage
              <select
                value={form.current_stage_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, current_stage_id: e.target.value }))
                }
              >
                <option value="">Auto stage</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Contact
              <select
                value={form.contact_id}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_id: e.target.value }))}
              >
                <option value="">No contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Company
              <select
                value={form.company_id}
                onChange={(e) => setForm((prev) => ({ ...prev, company_id: e.target.value }))}
              >
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Assigned to
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
              >
                <option value="">Auto assign</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name ?? profile.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Notes
              <input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update lead" : "Create lead"}
            </button>
            {editingId ? (
              <button className="btn btn-secondary" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>Pipeline board</h2>
        <div className="board board-wide">
          {stages.map((stage) => {
            const stageLeads = grouped[stage.id] ?? [];
            const stageValue = stageLeads.reduce(
              (sum, lead) => sum + Number(lead.estimated_value || 0),
              0,
            );

            return (
              <article key={stage.id} className="stage">
                <h3>{stage.name}</h3>
                <p className="small">Leads: {stageLeads.length}</p>
                <p className="small">Total value: {stageValue.toLocaleString()} EUR</p>

                {stageLeads.map((lead) => {
                  const currentIndex = stages.findIndex((item) => item.id === lead.current_stage_id);
                  const canMovePrev = currentIndex > 0;
                  const canMoveNext = currentIndex >= 0 && currentIndex < stages.length - 1;

                  return (
                    <div key={lead.id} className="lead-card stack">
                      <strong>{lead.title}</strong>
                      <span className="small">{Number(lead.estimated_value || 0).toLocaleString()} EUR</span>
                      <span className="small">
                        Assigned: {profiles.find((profile) => profile.id === lead.assigned_to)?.full_name ?? "-"}
                      </span>
                      <span className="small">Status: {lead.status}</span>

                      <select
                        value={lead.current_stage_id ?? ""}
                        onChange={(e) => void moveLeadStage(lead.id, e.target.value, "Select stage")}
                      >
                        {stages.map((targetStage) => (
                          <option key={targetStage.id} value={targetStage.id}>
                            {targetStage.name}
                          </option>
                        ))}
                      </select>

                      <div className="inline-actions">
                        <button
                          className="btn"
                          type="button"
                          disabled={!canMovePrev}
                          onClick={() => void quickMove(lead, "prev")}
                        >
                          Prev
                        </button>
                        <button
                          className="btn"
                          type="button"
                          disabled={!canMoveNext}
                          onClick={() => void quickMove(lead, "next")}
                        >
                          Next
                        </button>
                      </div>

                      <div className="inline-actions">
                        <button className="btn btn-secondary" type="button" onClick={() => startEdit(lead)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          type="button"
                          onClick={() => void deleteLead(lead.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel stack">
        <h2>Lead list</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Source</th>
              <th>Value</th>
              <th>Assigned to</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.title}</td>
                <td>{lead.current_stage_id ? stageById[lead.current_stage_id]?.name ?? "-" : "-"}</td>
                <td>{lead.status}</td>
                <td>{lead.source ?? "-"}</td>
                <td>{Number(lead.estimated_value || 0).toLocaleString()} EUR</td>
                <td>
                  {profiles.find((profile) => profile.id === lead.assigned_to)?.full_name ?? "-"}
                </td>
                <td>
                  <div className="inline-actions">
                    <button className="btn btn-secondary" type="button" onClick={() => startEdit(lead)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteLead(lead.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}