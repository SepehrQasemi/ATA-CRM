"use client";

import { FormEvent, useEffect, useState } from "react";
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
  notes: string;
};

const initialForm: ContactForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  company_id: "",
  notes: "",
};

export default function ContactsPage() {
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
      <section className="page-head">
        <h1>Contacts</h1>
        <p>Gestion des fiches contacts clients et prospects.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Filtrer les contacts</h2>
        <form className="row" onSubmit={handleFilterSubmit}>
          <label className="col-5 stack">
            Search
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Name or email"
            />
          </label>
          <label className="col-5 stack">
            Company
            <select
              value={filters.company_id}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, company_id: event.target.value }))
              }
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <div className="col-2 stack action-end">
            <button className="btn btn-secondary" type="submit">
              Apply filters
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
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>{editingId ? "Edit contact" : "Nouveau contact"}</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="row">
            <label className="col-3 stack">
              First name
              <input
                value={form.first_name}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              Last name
              <input
                value={form.last_name}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </label>
            <label className="col-3 stack">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              Job title
              <input
                value={form.job_title}
                onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
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
            <label className="col-4 stack">
              Notes
              <input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" disabled={saving} type="submit">
              {saving ? "Saving..." : editingId ? "Update contact" : "Create contact"}
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
        <h2>Liste des contacts</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th>Job title</th>
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
                <td>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => startEdit(contact)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void deleteContact(contact.id)}
                    >
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