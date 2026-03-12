"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { Company, Contact } from "@/lib/types";

type ContactDetailResponse = {
  contact?: Contact;
  company?: { id: string; name: string; company_role: "supplier" | "customer" | "both" } | null;
  error?: string;
};

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

export default function ContactProfilePage() {
  const { tr } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const [contact, setContact] = useState<Contact | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function syncForm(nextContact: Contact) {
    setForm({
      first_name: nextContact.first_name,
      last_name: nextContact.last_name,
      email: nextContact.email ?? "",
      phone: nextContact.phone ?? "",
      job_title: nextContact.job_title ?? "",
      company_id: nextContact.company_id ?? "",
      is_company_agent: nextContact.is_company_agent ?? false,
      agent_rank: String(nextContact.agent_rank ?? 1),
      notes: nextContact.notes ?? "",
    });
  }

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      setLoading(true);
      setError(null);

      const [contactRes, companiesRes] = await Promise.all([
        fetch(`/api/contacts/${id}`, { cache: "no-store" }),
        fetch("/api/companies", { cache: "no-store" }),
      ]);

      const contactJson = (await contactRes.json()) as ContactDetailResponse;
      const companiesJson = (await companiesRes.json()) as CompaniesResponse;

      if (!contactRes.ok || !contactJson.contact) {
        setError(contactJson.error ?? tr("Failed to load contact"));
        setLoading(false);
        return;
      }

      setContact(contactJson.contact);
      setCompany(contactJson.company ? { id: contactJson.company.id, name: contactJson.company.name } : null);
      syncForm(contactJson.contact);

      if (companiesRes.ok) {
        setCompanies(companiesJson.companies ?? []);
      }

      setLoading(false);
    }

    void loadData();
  }, [id, tr]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        company_id: form.company_id || null,
        is_company_agent: form.is_company_agent,
        agent_rank: form.is_company_agent ? Number(form.agent_rank || 1) : null,
      }),
    });
    const json = (await response.json()) as ContactDetailResponse;

    if (!response.ok || !json.contact) {
      setError(json.error ?? tr("Failed to update contact"));
      setSaving(false);
      return;
    }

    setContact(json.contact);
    syncForm(json.contact);
    const currentCompany = companies.find((item) => item.id === (json.contact?.company_id ?? ""));
    setCompany(currentCompany ? { id: currentCompany.id, name: currentCompany.name } : null);
    setSuccess(tr("Contact updated."));
    setEditing(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? tr("Failed to delete contact"));
      setDeleting(false);
      return;
    }

    router.push("/contacts");
    router.refresh();
  }

  const displayName = contact ? `${contact.first_name} ${contact.last_name}`.trim() : tr("Contact");

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Contact profile")}</h1>
        <p>{tr("View and update contact information in one place.")}</p>
      </section>

      <div className="inline-actions">
        <Link className="btn btn-secondary" href="/contacts">
          {tr("Back to contacts")}
        </Link>
        {contact && !editing ? (
          <button className="btn btn-primary" type="button" onClick={() => setEditing(true)}>
            {tr("Edit")}
          </button>
        ) : null}
      </div>

      {loading ? <p className="small">{tr("Loading data...")}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      {contact && !editing ? (
        <section className="panel stack">
          <h2>{displayName}</h2>
          <div className="row">
            <div className="stack col-4">
              <p className="small">{tr("Email")}</p>
              <p>{contact.email ?? "-"}</p>
            </div>
            <div className="stack col-4">
              <p className="small">{tr("Phone")}</p>
              <p>{contact.phone ?? "-"}</p>
            </div>
            <div className="stack col-4">
              <p className="small">{tr("Job title")}</p>
              <p>{contact.job_title ?? "-"}</p>
            </div>
            <div className="stack col-4">
              <p className="small">{tr("Company")}</p>
              <p>{company?.name ?? "-"}</p>
            </div>
            <div className="stack col-4">
              <p className="small">{tr("Company agent")}</p>
              <p>{contact.is_company_agent ? tr("Yes") : tr("No")}</p>
            </div>
            <div className="stack col-4">
              <p className="small">{tr("Agent rank")}</p>
              <p>
                {contact.is_company_agent
                  ? tr("Agent {rank}", { rank: contact.agent_rank ?? "-" })
                  : "-"}
              </p>
            </div>
            <div className="stack col-12">
              <p className="small">{tr("Notes")}</p>
              <p>{contact.notes ?? "-"}</p>
            </div>
          </div>
        </section>
      ) : null}

      {contact && editing ? (
        <section className="panel stack">
          <h2>{tr("Edit contact")}</h2>
          <form className="stack" onSubmit={handleSave}>
            <div className="row">
              <label className="col-3 stack">
                {tr("First name")}
                <input
                  value={form.first_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
                  required
                />
              </label>
              <label className="col-3 stack">
                {tr("Last name")}
                <input
                  value={form.last_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
                  required
                />
              </label>
              <label className="col-3 stack">
                {tr("Email")}
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label className="col-3 stack">
                {tr("Phone")}
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </label>
              <label className="col-4 stack">
                {tr("Job title")}
                <input
                  value={form.job_title}
                  onChange={(event) => setForm((prev) => ({ ...prev, job_title: event.target.value }))}
                />
              </label>
              <label className="col-4 stack">
                {tr("Company")}
                <select
                  value={form.company_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, company_id: event.target.value }))}
                >
                  <option value="">{tr("No company")}</option>
                  {companies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-4 stack">
                {tr("Company agent")}
                <select
                  value={form.is_company_agent ? "true" : "false"}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_company_agent: event.target.value === "true" }))
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
                  onChange={(event) => setForm((prev) => ({ ...prev, agent_rank: event.target.value }))}
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
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>
            </div>
            <div className="inline-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? tr("Saving...") : tr("Save")}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  if (contact) syncForm(contact);
                  setEditing(false);
                }}
              >
                {tr("Cancel edit")}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? tr("Processing...") : tr("Delete")}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
