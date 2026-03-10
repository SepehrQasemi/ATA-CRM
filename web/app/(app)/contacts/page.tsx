"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTip } from "@/components/page-tip";
import { useLocale } from "@/components/locale-provider";
import { Company, Contact } from "@/lib/types";

type ContactsResponse = { contacts: Contact[]; error?: string };
type CompaniesResponse = { companies: Company[]; error?: string };

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

export default function ContactsPage() {
  const { tr } = useLocale();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [filters, setFilters] = useState({ q: "", company_id: "" });

  async function loadData(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.company_id) params.set("company_id", activeFilters.company_id);

    const [contactsRes, companiesRes] = await Promise.all([
      fetch(`/api/contacts${params.toString() ? `?${params.toString()}` : ""}`),
      fetch("/api/companies"),
    ]);

    const contactsJson = (await contactsRes.json()) as ContactsResponse;
    const companiesJson = (await companiesRes.json()) as CompaniesResponse;

    if (!contactsRes.ok) {
      setError(contactsJson.error ?? "Failed to load contacts");
      return;
    }

    if (!companiesRes.ok) {
      setError(companiesJson.error ?? "Failed to load companies");
      return;
    }

    setContacts(contactsJson.contacts ?? []);
    setCompanies(companiesJson.companies ?? []);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const method = editingId ? "PATCH" : "POST";
    const endpoint = editingId ? `/api/contacts/${editingId}` : "/api/contacts";

    const response = await fetch(endpoint, {
      method,
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
      setError(json.error ?? "Failed to save contact");
      setSaving(false);
      return;
    }

    resetForm();
    setSaving(false);
    void loadData();
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      job_title: contact.job_title ?? "",
      company_id: contact.company_id ?? "",
      is_company_agent: contact.is_company_agent ?? false,
      agent_rank: String(contact.agent_rank ?? 1),
      notes: contact.notes ?? "",
    });
  }

  async function deleteContact(id: string) {
    const response = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      setError(json.error ?? "Failed to delete contact");
      return;
    }
    void loadData();
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    void loadData(filters);
  }

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
        <h2>{tr("Contact filters")}</h2>
        <form className="row" onSubmit={handleFilterSubmit}>
          <label className="col-5 stack">
            {tr("Search")}
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Name or email"
            />
          </label>
          <label className="col-5 stack">
            {tr("Company")}
            <select
              value={filters.company_id}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, company_id: event.target.value }))
              }
            >
              <option value="">{tr("All companies")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <div className="col-2 stack action-end">
            <button className="btn btn-secondary" type="submit">
              {tr("Apply filters")}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                const cleared = { q: "", company_id: "" };
                setFilters(cleared);
                void loadData(cleared);
              }}
            >
              {tr("Clear")}
            </button>
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>{editingId ? tr("Edit contact") : tr("New contact")}</h2>
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
              Company agent
              <select
                value={form.is_company_agent ? "true" : "false"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_company_agent: e.target.value === "true",
                  }))
                }
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            <label className="col-4 stack">
              Agent rank
              <select
                value={form.agent_rank}
                onChange={(e) => setForm((prev) => ({ ...prev, agent_rank: e.target.value }))}
                disabled={!form.is_company_agent}
              >
                <option value="1">Agent 1</option>
                <option value="2">Agent 2</option>
                <option value="3">Agent 3</option>
              </select>
            </label>
            <label className="col-12 stack">
              {tr("Notes")}
              <input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" disabled={saving} type="submit">
              {saving ? tr("Saving...") : editingId ? tr("Update contact") : tr("Create contact")}
            </button>
            {editingId ? (
              <button className="btn btn-secondary" type="button" onClick={resetForm}>
                {tr("Cancel edit")}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>{tr("Contact list")}</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th>Job title</th>
              <th>Agent</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td>
                  {contact.first_name} {contact.last_name}
                </td>
                <td>{contact.email ?? "-"}</td>
                <td>{contact.phone ?? "-"}</td>
                <td>
                  {companies.find((company) => company.id === contact.company_id)?.name ?? "-"}
                </td>
                <td>{contact.job_title ?? "-"}</td>
                <td>{contact.is_company_agent ? `Agent ${contact.agent_rank ?? "-"}` : "-"}</td>
                <td>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => startEdit(contact)}
                    >
                      {tr("Edit")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void deleteContact(contact.id)}
                    >
                      {tr("Delete")}
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
