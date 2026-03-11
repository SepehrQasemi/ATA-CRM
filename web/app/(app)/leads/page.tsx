"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { PaginationControls } from "@/components/pagination-controls";
import { PageTip } from "@/components/page-tip";
import { useLocale } from "@/components/locale-provider";
import {
  getLeadSuccessProbability,
  isLostStageName,
  isNegotiationStageName,
  isWonStageName,
} from "@/lib/pipeline-stage-labels";
import { Lead, PipelineStage } from "@/lib/types";
import { startsWithSuggestions } from "@/lib/search-suggestions";

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

type ProfileMeResponse = {
  profile?: { id: string; role: string };
};

type LeadForm = {
  title: string;
  source: string;
  estimated_value: string;
  current_stage_id: string;
  contact_id: string;
  company_id: string;
  assigned_to: string;
  notes: string;
};

const LEAD_SOURCE_OPTIONS = [
  "Trade show",
  "LinkedIn",
  "Existing customer",
  "Referral",
  "Website",
  "Cold call",
  "Inbound",
  "Other",
] as const;

const CLOSED_STAGE_PAGE_SIZE = 5;

const initialForm: LeadForm = {
  title: "",
  source: LEAD_SOURCE_OPTIONS[0],
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

const LEAD_FILTERS_STORAGE_KEY = "crm_saved_filters_leads";
type LeadWorkspaceTab = "pipeline" | "list" | "manage";

type AutocompleteOption = {
  id: string;
  label: string;
  searchTokens: string[];
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function optionMatchesQuery(option: AutocompleteOption, query: string): boolean {
  if (!query) return false;
  return option.searchTokens.some((token) => token.startsWith(query));
}

function buildAutocompleteSuggestions(options: AutocompleteOption[], rawQuery: string): string[] {
  const query = normalizeSearchValue(rawQuery);
  if (!query) return [];

  const seen = new Set<string>();
  const output: string[] = [];
  for (const option of options) {
    const key = option.label.toLowerCase();
    if (seen.has(key)) continue;
    if (!optionMatchesQuery(option, query)) continue;
    output.push(option.label);
    seen.add(key);
    if (output.length === 5) break;
  }
  return output;
}

function findOptionIdByLabel(options: AutocompleteOption[], rawValue: string): string {
  const normalized = normalizeSearchValue(rawValue);
  if (!normalized) return "";
  const match = options.find((option) => normalizeSearchValue(option.label) === normalized);
  return match?.id ?? "";
}

export default function LeadsPage() {
  const { tr } = useLocale();
  const searchParams = useSearchParams();
  const queryFromUrl = (searchParams.get("q") ?? "").trim();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contacts, setContacts] = useState<LeadResponse["contacts"]>([]);
  const [companies, setCompanies] = useState<LeadResponse["companies"]>([]);
  const [profiles, setProfiles] = useState<MetaResponse["profiles"]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("standard_user");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [form, setForm] = useState<LeadForm>(initialForm);
  const [contactQuery, setContactQuery] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [closedStagePages, setClosedStagePages] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<LeadWorkspaceTab>("pipeline");

  const isAdmin = currentUserRole === "admin";

  const stageById = useMemo(() => {
    const map: Record<string, PipelineStage> = {};
    stages.forEach((stage) => {
      map[stage.id] = stage;
    });
    return map;
  }, [stages]);

  const companyById = useMemo(() => {
    const map: Record<string, string> = {};
    companies.forEach((company) => {
      map[company.id] = company.name;
    });
    return map;
  }, [companies]);

  const contactById = useMemo(() => {
    const map: Record<string, string> = {};
    contacts.forEach((contact) => {
      map[contact.id] = `${contact.first_name} ${contact.last_name}`.trim();
    });
    return map;
  }, [contacts]);

  const profileNameById = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((profile) => {
      map[profile.id] = profile.full_name ?? profile.id.slice(0, 8);
    });
    return map;
  }, [profiles]);

  const contactOptions = useMemo<AutocompleteOption[]>(
    () =>
      contacts.map((contact) => {
        const name = `${contact.first_name} ${contact.last_name}`.trim();
        const email = contact.email?.trim() ?? "";
        const label = email ? `${name} - ${email}` : name;
        return {
          id: contact.id,
          label,
          searchTokens: [name, contact.first_name, contact.last_name, email]
            .join(" ")
            .toLowerCase()
            .split(/[\s@._-]+/)
            .filter(Boolean),
        };
      }),
    [contacts],
  );

  const companyOptions = useMemo<AutocompleteOption[]>(
    () =>
      companies.map((company) => ({
        id: company.id,
        label: company.name,
        searchTokens: company.name.toLowerCase().split(/[\s@._-]+/).filter(Boolean),
      })),
    [companies],
  );

  const assigneeOptions = useMemo<AutocompleteOption[]>(
    () =>
      profiles.map((profile) => {
        const label = profile.full_name ?? profile.id.slice(0, 8);
        return {
          id: profile.id,
          label,
          searchTokens: [label, profile.role].join(" ").toLowerCase().split(/[\s@._-]+/).filter(Boolean),
        };
      }),
    [profiles],
  );

  const contactLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    contactOptions.forEach((option) => {
      map[option.id] = option.label;
    });
    return map;
  }, [contactOptions]);

  const assigneeLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    assigneeOptions.forEach((option) => {
      map[option.id] = option.label;
    });
    return map;
  }, [assigneeOptions]);

  const contactSuggestions = useMemo(
    () => buildAutocompleteSuggestions(contactOptions, contactQuery),
    [contactOptions, contactQuery],
  );

  const companySuggestions = useMemo(
    () => buildAutocompleteSuggestions(companyOptions, companyQuery),
    [companyOptions, companyQuery],
  );

  const assigneeSuggestions = useMemo(
    () => buildAutocompleteSuggestions(assigneeOptions, assigneeQuery),
    [assigneeOptions, assigneeQuery],
  );

  const leadSourceOptions = useMemo(() => {
    const options = [...LEAD_SOURCE_OPTIONS] as string[];
    if (form.source && !options.includes(form.source)) {
      options.push(form.source);
    }
    return options;
  }, [form.source]);

  const wonStageId = useMemo(
    () => stages.find((stage) => isWonStageName(stage.name))?.id ?? null,
    [stages],
  );

  const lostStageId = useMemo(
    () => stages.find((stage) => isLostStageName(stage.name))?.id ?? null,
    [stages],
  );

  const currentUserLabel = useMemo(
    () => profileNameById[currentUserId] ?? tr("Auto assign"),
    [profileNameById, currentUserId, tr],
  );

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

    const [leadRes, metaRes, meRes] = await Promise.all([
      fetch(leadsUrl),
      fetch("/api/meta"),
      fetch("/api/profile/me"),
    ]);
    const leadJson = (await leadRes.json()) as LeadResponse;
    const metaJson = (await metaRes.json()) as MetaResponse;
    const meJson = (await meRes.json().catch(() => ({}))) as ProfileMeResponse;

    if (!leadRes.ok) {
      setError(leadJson.error ?? tr("Failed to load leads"));
      return;
    }

    if (!metaRes.ok) {
      setError(metaJson.error ?? tr("Failed to load metadata"));
      return;
    }

    setLeads(leadJson.leads ?? []);
    setStages(leadJson.stages ?? []);
    setContacts(leadJson.contacts ?? []);
    setCompanies(leadJson.companies ?? []);
    setProfiles(metaJson.profiles ?? []);
    setClosedStagePages({});

    if (meRes.ok && meJson.profile) {
      setCurrentUserId(meJson.profile.id);
      setCurrentUserRole(meJson.profile.role);
    }

    setForm((prev) => {
      let next = prev;
      if (!prev.current_stage_id && (leadJson.stages?.length ?? 0) > 0) {
        next = { ...next, current_stage_id: leadJson.stages[0].id };
      }
      if (!editingId && !prev.assigned_to && meJson.profile?.id) {
        next = { ...next, assigned_to: meJson.profile.id };
      }
      return next;
    });
  }

  useEffect(() => {
    let initial = initialFilters;
    try {
      const saved = window.localStorage.getItem(LEAD_FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<LeadFilters>;
        initial = { ...initialFilters, ...parsed };
      }
    } catch {
      initial = initialFilters;
    }
    if (queryFromUrl) {
      initial = { ...initial, q: queryFromUrl };
      setActiveTab("list");
    }
    setFilters(initial);
    void loadData(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFromUrl]);

  function resetForm() {
    setEditingId(null);
    setContactQuery("");
    setCompanyQuery("");
    setAssigneeQuery("");
    setForm({
      ...initialForm,
      source: LEAD_SOURCE_OPTIONS[0],
      current_stage_id: stages[0]?.id ?? "",
      assigned_to: currentUserId,
    });
  }

  function setContactFromInput(value: string) {
    setContactQuery(value);
    setForm((prev) => ({ ...prev, contact_id: findOptionIdByLabel(contactOptions, value) }));
  }

  function setCompanyFromInput(value: string) {
    setCompanyQuery(value);
    setForm((prev) => ({ ...prev, company_id: findOptionIdByLabel(companyOptions, value) }));
  }

  function setAssigneeFromInput(value: string) {
    setAssigneeQuery(value);
    setForm((prev) => ({ ...prev, assigned_to: findOptionIdByLabel(assigneeOptions, value) }));
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
        source: form.source.trim() || LEAD_SOURCE_OPTIONS[0],
        estimated_value: Number(form.estimated_value || 0),
        contact_id: form.contact_id || null,
        company_id: form.company_id || null,
        assigned_to: isAdmin ? form.assigned_to || null : null,
        current_stage_id: form.current_stage_id || null,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? tr("Failed to save lead"));
      setSaving(false);
      return;
    }

    setSaving(false);
    resetForm();
    setActiveTab("pipeline");
    void loadData();
  }

  function startEdit(lead: Lead) {
    setEditingId(lead.id);
    setActiveTab("manage");
    setForm({
      title: lead.title,
      source: lead.source ?? LEAD_SOURCE_OPTIONS[0],
      estimated_value: String(Number(lead.estimated_value || 0)),
      current_stage_id: lead.current_stage_id ?? "",
      contact_id: lead.contact_id ?? "",
      company_id: lead.company_id ?? "",
      assigned_to: lead.assigned_to ?? lead.owner_id ?? currentUserId,
      notes: lead.notes ?? "",
    });
    setContactQuery(lead.contact_id ? contactLabelById[lead.contact_id] ?? "" : "");
    setCompanyQuery(lead.company_id ? companyById[lead.company_id] ?? "" : "");
    setAssigneeQuery(
      lead.assigned_to
        ? assigneeLabelById[lead.assigned_to] ?? profileNameById[lead.assigned_to] ?? ""
        : "",
    );
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
      setError(json.error ?? tr("Failed to move lead"));
      return;
    }
    void loadData();
  }

  async function quickMove(lead: Lead, direction: "prev" | "next") {
    if (!lead.current_stage_id) return;
    const currentIndex = stages.findIndex((stage) => stage.id === lead.current_stage_id);
    if (currentIndex === -1) return;
    if (direction === "next" && isNegotiationStageName(stageById[lead.current_stage_id]?.name)) {
      return;
    }

    const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    await moveLeadStage(
      lead.id,
      stages[targetIndex].id,
      direction === "prev" ? tr("Quick move backward") : tr("Quick move forward"),
    );
  }

  async function deleteLead(leadId: string) {
    const response = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? tr("Failed to delete lead"));
      return;
    }
    void loadData();
  }

  async function createTaskFromLead(lead: Lead) {
    const due = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Follow-up: ${lead.title}`,
        description: tr("Quick task created from lead {lead}", { lead: lead.title }),
        due_date: due,
        priority: "normal",
        status: "todo",
        assigned_to: lead.assigned_to ?? null,
        lead_id: lead.id,
        company_id: lead.company_id ?? null,
        contact_id: lead.contact_id ?? null,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? tr("Failed to create task"));
      return;
    }
    setError(null);
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

  const leadSearchSuggestions = useMemo(
    () => startsWithSuggestions(leads.map((lead) => lead.title), filters.q, 5),
    [leads, filters.q],
  );

  return (
    <div className="stack">
      <PageTip
        id="tip-leads-quick-actions"
        title={tr("Quick onboarding")}
        detail={tr("Use quick stage moves and create follow-up tasks directly from each lead card.")}
      />
      <section className="page-head">
        <h1>{tr("Leads & Pipeline")}</h1>
        <p>{tr("Track prospects from first contact to conversion.")}</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <div className="subtabs" role="tablist" aria-label={tr("Leads workspace tabs")}>
          <button
            className={`subtab ${activeTab === "pipeline" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "pipeline"}
            onClick={() => setActiveTab("pipeline")}
          >
            {tr("Pipeline board")}
          </button>
          <button
            className={`subtab ${activeTab === "list" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "list"}
            onClick={() => setActiveTab("list")}
          >
            {tr("Lead list")}
          </button>
          <button
            className={`subtab ${activeTab === "manage" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "manage"}
            onClick={() => setActiveTab("manage")}
          >
            {tr("New lead")}
          </button>
        </div>
      </section>

      {activeTab !== "manage" ? (
      <section className="panel stack">
        <h2>{tr("Lead filters")}</h2>
        <form className="row" onSubmit={handleFilterSubmit}>
          <label className="col-3 stack">
            {tr("Search")}
            <AutocompleteInput
              value={filters.q}
              onChange={(nextValue) => setFilters((prev) => ({ ...prev, q: nextValue }))}
              placeholder={tr("Lead title")}
              suggestions={leadSearchSuggestions}
              listId="lead-search-suggestions"
            />
          </label>
          <label className="col-3 stack">
            {tr("Stage")}
            <select
              value={filters.stage_id}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, stage_id: event.target.value }))
              }
            >
              <option value="">{tr("All stages")}</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {tr(stage.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="col-2 stack">
            {tr("Status")}
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">{tr("All")}</option>
              <option value="open">{tr("Open")}</option>
              <option value="won">{tr("Won")}</option>
              <option value="lost">{tr("Lost")}</option>
            </select>
          </label>
          <label className="col-2 stack">
            {tr("Assigned to")}
            <select
              value={filters.assigned_to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, assigned_to: event.target.value }))
              }
            >
              <option value="">{tr("All")}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name ?? profile.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label className="col-2 stack">
            {tr("Source")}
            <select
              value={filters.source}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, source: event.target.value }))
              }
            >
              <option value="">{tr("All")}</option>
              {LEAD_SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {tr(source)}
                </option>
              ))}
            </select>
          </label>
          <label className="col-2 stack">
            {tr("Value from")}
            <input
              type="number"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </label>
          <label className="col-2 stack">
            {tr("Value to")}
            <input
              type="number"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </label>
          <div className="col-2 stack action-end">
            <button className="btn btn-secondary" type="submit">
              {tr("Apply filters")}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                window.localStorage.setItem(LEAD_FILTERS_STORAGE_KEY, JSON.stringify(filters));
              }}
            >
              {tr("Save filters")}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                void loadData(initialFilters);
              }}
            >
              {tr("Clear")}
            </button>
          </div>
        </form>
      </section>
      ) : null}

      {activeTab === "manage" ? (
      <section className="panel stack">
        <h2>{editingId ? tr("Edit lead") : tr("New lead")}</h2>
        <form className="stack" onSubmit={handleSaveLead}>
          <div className="row">
            <label className="col-4 stack">
              {tr("Title")}
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              {tr("Source")}
              <select
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
              >
                {leadSourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {tr(source)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-2 stack">
              {tr("Estimated value")}
              <input
                type="number"
                value={form.estimated_value}
                onChange={(e) => setForm((prev) => ({ ...prev, estimated_value: e.target.value }))}
              />
            </label>
            <label className="col-2 stack">
              {tr("Stage")}
              <select
                value={form.current_stage_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, current_stage_id: e.target.value }))
                }
              >
                <option value="">{tr("Auto stage")}</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {tr(stage.name)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-4 stack">
              {tr("Contact")}
              <AutocompleteInput
                value={contactQuery}
                onChange={setContactFromInput}
                placeholder={tr("Contact name or email")}
                suggestions={contactSuggestions}
                listId="lead-contact-suggestions"
              />
            </label>
            <label className="col-4 stack">
              {tr("Company")}
              <AutocompleteInput
                value={companyQuery}
                onChange={setCompanyFromInput}
                placeholder={tr("Company name")}
                suggestions={companySuggestions}
                listId="lead-company-suggestions"
              />
            </label>
            <label className="col-4 stack">
              {tr("Assigned to")}
              {isAdmin ? (
                <AutocompleteInput
                  value={assigneeQuery}
                  onChange={setAssigneeFromInput}
                  placeholder={tr("Type colleague name")}
                  suggestions={assigneeSuggestions}
                  listId="lead-assignee-suggestions"
                />
              ) : (
                <input value={currentUserLabel} readOnly />
              )}
            </label>
            <label className="col-12 stack">
              {tr("Notes")}
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
          </div>
          {!isAdmin ? (
            <p className="small">{tr("Lead stays assigned to creator unless admin reassigns it.")}</p>
          ) : null}
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? tr("Saving...") : editingId ? tr("Update lead") : tr("Create lead")}
            </button>
            {editingId ? (
              <button className="btn btn-secondary" type="button" onClick={resetForm}>
                {tr("Cancel edit")}
              </button>
            ) : null}
          </div>
        </form>
      </section>
      ) : null}

      {activeTab === "pipeline" ? (
      <section className="panel stack">
        <h2>{tr("Pipeline board")}</h2>
        <div className="board board-wide">
          {stages.map((stage) => {
            const stageLeads = grouped[stage.id] ?? [];
            const stageValue = stageLeads.reduce(
              (sum, lead) => sum + Number(lead.estimated_value || 0),
              0,
            );
            const isClosedOutcomeStage = isWonStageName(stage.name) || isLostStageName(stage.name);
            const totalPages = isClosedOutcomeStage
              ? Math.max(1, Math.ceil(stageLeads.length / CLOSED_STAGE_PAGE_SIZE))
              : 1;
            const currentPage = Math.min(closedStagePages[stage.id] ?? 1, totalPages);
            const visibleLeads = isClosedOutcomeStage
              ? stageLeads.slice(
                  (currentPage - 1) * CLOSED_STAGE_PAGE_SIZE,
                  currentPage * CLOSED_STAGE_PAGE_SIZE,
                )
              : stageLeads;

            return (
              <article key={stage.id} className="stage">
                <h3>{tr(stage.name)}</h3>
                <p className="small">{tr("Leads")}: {stageLeads.length}</p>
                <p className="small">{tr("Total value")}: {stageValue.toLocaleString()} EUR</p>

                {visibleLeads.length === 0 ? <p className="small">{tr("No data found.")}</p> : null}

                {visibleLeads.map((lead) => {
                  const currentIndex = stages.findIndex((item) => item.id === lead.current_stage_id);
                  const currentStageName = lead.current_stage_id
                    ? stageById[lead.current_stage_id]?.name ?? ""
                    : "";
                  const isNegotiation = isNegotiationStageName(currentStageName);
                  const successProbability = getLeadSuccessProbability({
                    stageName: currentStageName,
                    status: lead.status,
                  });
                  const canMovePrev = currentIndex > 0;
                  const canMoveNext =
                    !isNegotiation && currentIndex >= 0 && currentIndex < stages.length - 1;
                  const assignedLabel =
                    profileNameById[lead.assigned_to ?? ""] ??
                    profileNameById[lead.owner_id ?? ""] ??
                    "-";

                  return (
                    <div key={lead.id} className="lead-card stack">
                      <strong className="lead-card-title">{lead.title}</strong>
                      <span className="small lead-card-line">
                        {tr("Company")}: {companyById[lead.company_id ?? ""] ?? "-"}
                      </span>
                      <span className="small lead-card-line">
                        {tr("Agent")}: {contactById[lead.contact_id ?? ""] ?? "-"}
                      </span>
                      <span className="small lead-card-line">
                        {tr("Assigned to")}: {assignedLabel}
                      </span>
                      <span className="small lead-card-line">
                        {tr("Success probability")}: {successProbability}%
                      </span>
                      <div className="inline-actions lead-card-actions">
                        <button className="btn btn-secondary" type="button" onClick={() => startEdit(lead)}>
                          {tr("Edit")}
                        </button>
                        <button
                          className="btn"
                          type="button"
                          disabled={!canMovePrev}
                          onClick={() => void quickMove(lead, "prev")}
                        >
                          {tr("Prev")}
                        </button>
                        <button
                          className="btn"
                          type="button"
                          disabled={!canMoveNext}
                          onClick={() => void quickMove(lead, "next")}
                        >
                          {tr("Next")}
                        </button>
                        {isNegotiation ? (
                          <>
                            <button
                              className="btn btn-primary"
                              type="button"
                              disabled={!wonStageId}
                              onClick={() => {
                                if (!wonStageId) return;
                                void moveLeadStage(lead.id, wonStageId, tr("Marked as won from negotiation"));
                              }}
                            >
                              {tr("Mark Won")}
                            </button>
                            <button
                              className="btn btn-danger"
                              type="button"
                              disabled={!lostStageId}
                              onClick={() => {
                                if (!lostStageId) return;
                                void moveLeadStage(lead.id, lostStageId, tr("Marked as lost from negotiation"));
                              }}
                            >
                              {tr("Mark Lost")}
                            </button>
                          </>
                        ) : null}
                        <button className="btn btn-secondary" type="button" onClick={() => void createTaskFromLead(lead)}>
                          {tr("Create task")}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {isClosedOutcomeStage && stageLeads.length > CLOSED_STAGE_PAGE_SIZE ? (
                  <PaginationControls
                    page={currentPage}
                    totalPages={totalPages}
                    onPageChange={(nextPage) =>
                      setClosedStagePages((prev) => ({
                        ...prev,
                        [stage.id]: Math.min(Math.max(nextPage, 1), totalPages),
                      }))
                    }
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
      ) : null}

      {activeTab === "list" ? (
      <section className="panel stack">
        <h2>{tr("Lead list")}</h2>
        <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{tr("Title")}</th>
              <th>{tr("Stage")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Source")}</th>
              <th>{tr("Value")}</th>
              <th>{tr("Assigned to")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.title}</td>
                <td>{lead.current_stage_id ? tr(stageById[lead.current_stage_id]?.name ?? "-") : "-"}</td>
                <td>{tr(lead.status === "open" ? "Open" : lead.status === "won" ? "Won" : "Lost")}</td>
                <td>{lead.source ?? "-"}</td>
                <td>{Number(lead.estimated_value || 0).toLocaleString()} EUR</td>
                <td>
                  {profiles.find((profile) => profile.id === lead.assigned_to)?.full_name ?? "-"}
                </td>
                <td>
                  <div className="inline-actions">
                    <button className="btn btn-secondary" type="button" onClick={() => startEdit(lead)}>
                      {tr("Edit")}
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteLead(lead.id)}>
                      {tr("Delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
      ) : null}
    </div>
  );
}
