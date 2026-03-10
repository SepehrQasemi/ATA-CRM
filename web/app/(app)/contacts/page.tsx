"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { PaginationControls } from "@/components/pagination-controls";
import { PageTip } from "@/components/page-tip";
import { useLocale } from "@/components/locale-provider";
import { Company, Contact } from "@/lib/types";
import { startsWithSuggestions } from "@/lib/search-suggestions";

type ContactsResponse = { contacts: Contact[]; error?: string };
type CompaniesResponse = { companies: Company[]; error?: string };
type ContactFilters = {
  q: string;
  company_id: string;
  company_q: string;
};

type ContactForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  company_id: string;
  is_company_agent: boolean;
  agent_rank: string;
  notes: string;
};

const initialForm: ContactForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  company_id: "",
  is_company_agent: false,
  agent_rank: "1",
  notes: "",
};

const initialFilters: ContactFilters = { q: "", company_id: "", company_q: "" };
const PER_PAGE = 20;

type ContactWorkspaceTab = "list" | "create";

export default function ContactsPage() {
  const { tr } = useLocale();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [filters, setFilters] = useState<ContactFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<ContactWorkspaceTab>("list");
  const [page, setPage] = useState(1);

  async function loadData(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.company_id) params.set("company_id", activeFilters.company_id);
    if (activeFilters.company_q.trim()) params.set("company_q", activeFilters.company_q.trim());

    const [contactsRes, companiesRes] = await Promise.all([
      fetch(`/api/contacts${params.toString() ? `?${params.toString()}` : ""}`),
      fetch("/api/companies"),
    ]);

    const contactsJson = (await contactsRes.json()) as ContactsResponse;
    const companiesJson = (await companiesRes.json()) as CompaniesResponse;

    if (!contactsRes.ok) {
      setError(contactsJson.error ?? tr("Failed to load contacts"));
      return;
    }

    if (!companiesRes.ok) {
      setError(companiesJson.error ?? tr("Failed to load companies"));
      return;
    }

    setContacts(contactsJson.contacts ?? []);
    setCompanies(companiesJson.companies ?? []);
    setPage(1);
  }

  const contactSearchSuggestions = useMemo(
    () =>
      startsWithSuggestions(
        contacts.map((contact) => `${contact.first_name} ${contact.last_name}`),
        filters.q,
        5,
      ),
    [contacts, filters.q],
  );

  const companyFilterSuggestions = useMemo(
    () => startsWithSuggestions(companies.map((company) => company.name), filters.company_q, 5),
    [companies, filters.company_q],
  );

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        company_id: form.company_id || null,
        is_company_agent: form.is_company_agent,
        agent_rank: form.is_company_agent ? Number(form.agent_rank || 1) : null,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? tr("Failed to create contact"));
      setSaving(false);
      return;
    }

    setForm(initialForm);
    setSaving(false);
    setActiveTab("list");
    void loadData();
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    void loadData(filters);
  }

  const totalPages = Math.max(1, Math.ceil(contacts.length / PER_PAGE));
  const visibleContacts = contacts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="stack">
      <PageTip
        id="tip-contacts-link-company"
        title={tr("Quick onboarding")}
        detail={tr("Link contacts to companies so pipeline and email automation stay consistent.")}
      />
      <section className="page-head">
        <h1>{tr("Contacts")}</h1>
        <p>{tr("Manage customer and prospect contact records.")}</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <div className="subtabs" role="tablist" aria-label={tr("Contacts workspace tabs")}>
          <button
            className={`subtab ${activeTab === "list" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "list"}
            onClick={() => setActiveTab("list")}
          >
            {tr("Contact list")}
          </button>
          <button
            className={`subtab ${activeTab === "create" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            onClick={() => setActiveTab("create")}
          >
            {tr("New contact")}
          </button>
        </div>
      </section>

      {activeTab === "list" ? (
        <section className="panel stack">
          <h2>{tr("Contact filters")}</h2>
          <form className="row" onSubmit={handleFilterSubmit}>
            <label className="col-5 stack">
              {tr("Search")}
              <AutocompleteInput
                value={filters.q}
                onChange={(nextValue) => setFilters((prev) => ({ ...prev, q: nextValue }))}
                placeholder={tr("Contact name or email")}
                suggestions={contactSearchSuggestions}
                listId="contact-search-suggestions"
              />
            </label>
            <label className="col-5 stack">
              {tr("Company")}
              <AutocompleteInput
                value={filters.company_q}
                onChange={(nextValue) => {
                  const exactCompanyId =
                    companies.find(
                      (company) => company.name.trim().toLowerCase() === nextValue.trim().toLowerCase(),
                    )?.id ?? "";
                  setFilters((prev) => ({
                    ...prev,
                    company_q: nextValue,
                    company_id: exactCompanyId,
                  }));
                }}
                placeholder={tr("Company name")}
                suggestions={companyFilterSuggestions}
                listId="contact-company-suggestions"
              />
            </label>
            <div className="col-2 stack action-end">
              <button className="btn btn-secondary" type="submit">
                {tr("Apply filters")}
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

      {activeTab === "create" ? (
        <section className="panel stack">
          <h2>{tr("New contact")}</h2>
          <form className="stack" onSubmit={handleSubmit}>
            <div className="row">
              <label className="col-3 stack">
                {tr("First name")}
                <input
                  value={form.first_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </label>
              <label className="col-3 stack">
                {tr("Last name")}
                <input
                  value={form.last_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  required
                />
              </label>
              <label className="col-3 stack">
                {tr("Email")}
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
              <label className="col-3 stack">
                {tr("Phone")}
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
              <label className="col-4 stack">
                {tr("Job title")}
                <input
                  value={form.job_title}
                  onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))}
                />
              </label>
              <label className="col-4 stack">
                {tr("Company")}
                <select
                  value={form.company_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, company_id: e.target.value }))}
                >
                  <option value="">{tr("No company")}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-4 stack">
                {tr("Company agent")}
                <select
                  value={form.is_company_agent ? "true" : "false"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_company_agent: e.target.value === "true",
                    }))
                  }
                >
                  <option value="false">{tr("No")}</option>
                  <option value="true">{tr("Yes")}</option>
                </select>
              </label>
              <label className="col-4 stack">
                {tr("Agent rank")}
                <select
                  value={form.agent_rank}
                  onChange={(e) => setForm((prev) => ({ ...prev, agent_rank: e.target.value }))}
                  disabled={!form.is_company_agent}
                >
                  <option value="1">{tr("Agent {rank}", { rank: 1 })}</option>
                  <option value="2">{tr("Agent {rank}", { rank: 2 })}</option>
                  <option value="3">{tr("Agent {rank}", { rank: 3 })}</option>
                </select>
              </label>
              <label className="col-12 stack">
                {tr("Notes")}
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
            </div>
            <div className="inline-actions">
              <button className="btn btn-primary" disabled={saving} type="submit">
                {saving ? tr("Saving...") : tr("Create contact")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {activeTab === "list" ? (
        <section className="panel stack">
          <h2>{tr("Contact list")}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Name")}</th>
                  <th>{tr("Email")}</th>
                  <th>{tr("Phone")}</th>
                  <th>{tr("Company")}</th>
                  <th>{tr("Job title")}</th>
                  <th>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      {contact.first_name} {contact.last_name}
                    </td>
                    <td>{contact.email ?? "-"}</td>
                    <td>{contact.phone ?? "-"}</td>
                    <td>{companies.find((company) => company.id === contact.company_id)?.name ?? "-"}</td>
                    <td>{contact.job_title ?? "-"}</td>
                    <td>
                      <Link className="btn btn-secondary" href={`/contacts/${contact.id}`}>
                        {tr("View details")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      ) : null}
    </div>
  );
}
