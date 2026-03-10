"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { Company } from "@/lib/types";

type CompanyAgent = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  agent_rank: number | null;
  created_at: string;
};

type CompanyLink = {
  id: string;
  product_id: string;
  company_id: string;
  relation_type: "traded" | "potential";
  product_model: string;
  last_price: number | null;
  notes: string | null;
  created_at: string;
};

type CompanyDetailResponse = {
  company?: Company;
  links?: CompanyLink[];
  products?: Array<{ id: string; name: string }>;
  agents?: CompanyAgent[];
  error?: string;
};

type CompanyForm = {
  name: string;
  company_role: "supplier" | "customer" | "both";
  sector: string;
  city: string;
  country: string;
  website: string;
  notes: string;
};

const initialForm: CompanyForm = {
  name: "",
  company_role: "both",
  sector: "",
  city: "",
  country: "",
  website: "",
  notes: "",
};

function companyRoleLabel(
  role: "supplier" | "customer" | "both",
  tr: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (role === "supplier") return tr("Supplier");
  if (role === "customer") return tr("Customer");
  return tr("Supplier + Customer");
}

export default function CompanyProfilePage() {
  const { tr } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const [company, setCompany] = useState<Company | null>(null);
  const [links, setLinks] = useState<CompanyLink[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [agents, setAgents] = useState<CompanyAgent[]>([]);
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function syncForm(nextCompany: Company) {
    setForm({
      name: nextCompany.name,
      company_role: nextCompany.company_role ?? "both",
      sector: nextCompany.sector ?? "",
      city: nextCompany.city ?? "",
      country: nextCompany.country ?? "",
      website: nextCompany.website ?? "",
      notes: nextCompany.notes ?? "",
    });
  }

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/companies/${id}`, { cache: "no-store" });
    const json = (await response.json()) as CompanyDetailResponse;

    if (!response.ok || !json.company) {
      setError(json.error ?? "Failed to load company");
      setLoading(false);
      return;
    }

    setCompany(json.company);
    setLinks(json.links ?? []);
    setProducts(json.products ?? []);
    setAgents(json.agents ?? []);
    syncForm(json.company);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const productById = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((product) => {
      map[product.id] = product.name;
    });
    return map;
  }, [products]);

  const traded = links.filter((item) => item.relation_type === "traded");
  const potential = links.filter((item) => item.relation_type === "potential");

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = (await response.json()) as { company?: Company; error?: string };
    if (!response.ok || !json.company) {
      setError(json.error ?? "Failed to update company");
      setSaving(false);
      return;
    }

    setCompany(json.company);
    syncForm(json.company);
    setSuccess("Company updated.");
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Failed to delete company");
      setDeleting(false);
      return;
    }

    router.push("/companies");
    router.refresh();
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Company profile")}</h1>
        <p>{tr("View and update company information in one place.")}</p>
      </section>

      <div className="inline-actions">
        <Link className="btn btn-secondary" href="/companies">
          {tr("Back to companies")}
        </Link>
        {company && !editing ? (
          <button className="btn btn-primary" type="button" onClick={() => setEditing(true)}>
            {tr("Edit")}
          </button>
        ) : null}
      </div>

      {loading ? <p className="small">{tr("Loading data...")}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      {company && !editing ? (
        <>
          <section className="panel stack">
            <h2>{company.name}</h2>
            <div className="row">
              <div className="stack col-4">
                <p className="small">{tr("Role")}</p>
                <p>{companyRoleLabel(company.company_role ?? "both", tr)}</p>
              </div>
              <div className="stack col-4">
                <p className="small">{tr("Sector")}</p>
                <p>{company.sector ?? "-"}</p>
              </div>
              <div className="stack col-4">
                <p className="small">{tr("Website")}</p>
                <p>{company.website ?? "-"}</p>
              </div>
              <div className="stack col-4">
                <p className="small">{tr("City")}</p>
                <p>{company.city ?? "-"}</p>
              </div>
              <div className="stack col-4">
                <p className="small">{tr("Country")}</p>
                <p>{company.country ?? "-"}</p>
              </div>
              <div className="stack col-12">
                <p className="small">{tr("Notes")}</p>
                <p>{company.notes ?? "-"}</p>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <h2>{tr("Company agents")}</h2>
            {agents.length === 0 ? (
              <p className="small">{tr("No data found.")}</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("Name")}</th>
                      <th>{tr("Rank")}</th>
                      <th>{tr("Email")}</th>
                      <th>{tr("Phone")}</th>
                      <th>{tr("Job title")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id}>
                        <td>{`${agent.first_name} ${agent.last_name}`}</td>
                        <td>{agent.agent_rank ? `Agent ${agent.agent_rank}` : "-"}</td>
                        <td>{agent.email ?? "-"}</td>
                        <td>{agent.phone ?? "-"}</td>
                        <td>{agent.job_title ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel stack">
            <h2>{tr("Traded products (model)")}</h2>
            {traded.length === 0 ? (
              <p className="small">{tr("No data found.")}</p>
            ) : (
              <div className="tag-list">
                {traded.map((link) => (
                  <span key={link.id} className="tag tag-traded">
                    {(productById[link.product_id] ?? tr("Product")) +
                      (link.product_model ? ` (${link.product_model})` : "")}
                  </span>
                ))}
              </div>
            )}

            <h2>{tr("Potential products (model)")}</h2>
            {potential.length === 0 ? (
              <p className="small">{tr("No data found.")}</p>
            ) : (
              <div className="tag-list">
                {potential.map((link) => (
                  <span key={link.id} className="tag tag-potential">
                    {(productById[link.product_id] ?? tr("Product")) +
                      (link.product_model ? ` (${link.product_model})` : "")}
                  </span>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {company && editing ? (
        <section className="panel stack">
          <h2>{tr("Edit company")}</h2>
          <form className="stack" onSubmit={handleSave}>
            <div className="row">
              <label className="col-3 stack">
                {tr("Name")}
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="col-3 stack">
                {tr("Company role")}
                <select
                  value={form.company_role}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      company_role: event.target.value as "supplier" | "customer" | "both",
                    }))
                  }
                >
                  <option value="supplier">{tr("Supplier")}</option>
                  <option value="customer">{tr("Customer")}</option>
                  <option value="both">{tr("Supplier + Customer")}</option>
                </select>
              </label>
              <label className="col-3 stack">
                {tr("Sector")}
                <input
                  value={form.sector}
                  onChange={(event) => setForm((prev) => ({ ...prev, sector: event.target.value }))}
                />
              </label>
              <label className="col-3 stack">
                {tr("Website")}
                <input
                  value={form.website}
                  onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                />
              </label>
              <label className="col-3 stack">
                {tr("City")}
                <input
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                />
              </label>
              <label className="col-3 stack">
                {tr("Country")}
                <input
                  value={form.country}
                  onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                />
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
                  if (company) syncForm(company);
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
