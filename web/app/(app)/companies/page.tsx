"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Company } from "@/lib/types";

type ProductOption = { id: string; name: string };
type CompanyProductLink = {
  id: string;
  company_id: string;
  product_id: string;
  relation_type: "traded" | "potential";
};

type CompaniesResponse = {
  companies: Company[];
  products: ProductOption[];
  links: CompanyProductLink[];
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
  sector: "Food Ingredients",
  city: "",
  country: "",
  website: "",
  notes: "",
};

type CompanyFilters = { q: string; sector: string; company_role: string };
const initialFilters: CompanyFilters = { q: "", sector: "", company_role: "" };

function companyRoleLabel(role: "supplier" | "customer" | "both") {
  if (role === "supplier") return "Supplier";
  if (role === "customer") return "Customer";
  return "Supplier + Customer";
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [links, setLinks] = useState<CompanyProductLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [filters, setFilters] = useState<CompanyFilters>(initialFilters);

  async function loadCompanies(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.sector.trim()) params.set("sector", activeFilters.sector.trim());
    if (activeFilters.company_role.trim())
      params.set("company_role", activeFilters.company_role.trim());

    const query = params.toString();
    const response = await fetch(`/api/companies${query ? `?${query}` : ""}`);
    const json = (await response.json()) as CompaniesResponse;

    if (!response.ok) {
      setError(json.error ?? "Failed to load companies");
      return;
    }

    setCompanies(json.companies ?? []);
    setProducts(json.products ?? []);
    setLinks(json.links ?? []);
  }

  useEffect(() => {
    void loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productById = useMemo(() => {
    const map: Record<string, ProductOption> = {};
    products.forEach((product) => {
      map[product.id] = product;
    });
    return map;
  }, [products]);

  const productBucketsByCompany = useMemo(() => {
    const map: Record<string, { traded: string[]; potential: string[] }> = {};
    links.forEach((link) => {
      if (!map[link.company_id]) {
        map[link.company_id] = { traded: [], potential: [] };
      }
      const productName = productById[link.product_id]?.name ?? "Unknown product";
      if (link.relation_type === "traded") {
        map[link.company_id].traded.push(productName);
      } else {
        map[link.company_id].potential.push(productName);
      }
    });
    return map;
  }, [links, productById]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const method = editingId ? "PATCH" : "POST";
    const endpoint = editingId ? `/api/companies/${editingId}` : "/api/companies";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to save company");
      setSaving(false);
      return;
    }

    resetForm();
    setSaving(false);
    void loadCompanies();
  }

  async function deleteCompany(id: string) {
    const response = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      setError(json.error ?? "Failed to delete company");
      return;
    }
    void loadCompanies();
  }

  function startEdit(company: Company) {
    setEditingId(company.id);
    setForm({
      name: company.name,
      company_role: company.company_role ?? "both",
      sector: company.sector ?? "",
      city: company.city ?? "",
      country: company.country ?? "",
      website: company.website ?? "",
      notes: company.notes ?? "",
    });
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    void loadCompanies(filters);
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Companies</h1>
        <p>Manage partner companies, define their role, and track traded/potential product buckets.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Company filters</h2>
        <form className="row" onSubmit={handleFilterSubmit}>
          <label className="col-4 stack">
            Search (name)
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Search by company name"
            />
          </label>
          <label className="col-4 stack">
            Sector
            <input
              value={filters.sector}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, sector: event.target.value }))
              }
              placeholder="Food Ingredients"
            />
          </label>
          <label className="col-2 stack">
            Role
            <select
              value={filters.company_role}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, company_role: event.target.value }))
              }
            >
              <option value="">All</option>
              <option value="supplier">Supplier or Both</option>
              <option value="customer">Customer or Both</option>
              <option value="both">Both only</option>
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
                setFilters(initialFilters);
                void loadCompanies(initialFilters);
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>{editingId ? "Edit company" : "New company"}</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="row">
            <label className="col-3 stack">
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              Company role
              <select
                value={form.company_role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    company_role: e.target.value as "supplier" | "customer" | "both",
                  }))
                }
              >
                <option value="supplier">Supplier</option>
                <option value="customer">Customer</option>
                <option value="both">Supplier + Customer</option>
              </select>
            </label>
            <label className="col-3 stack">
              Sector
              <input
                value={form.sector}
                onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))}
              />
            </label>
            <label className="col-3 stack">
              City
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </label>
            <label className="col-3 stack">
              Country
              <input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </label>
            <label className="col-3 stack">
              Website
              <input
                value={form.website}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              />
            </label>
            <label className="col-6 stack">
              Notes
              <input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" disabled={saving} type="submit">
              {saving ? "Saving..." : editingId ? "Update company" : "Create company"}
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
        <h2>Company list</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Sector</th>
              <th>City</th>
              <th>Country</th>
              <th>Traded products</th>
              <th>Potential products</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const buckets = productBucketsByCompany[company.id] ?? { traded: [], potential: [] };
              return (
                <tr key={company.id}>
                  <td>{company.name}</td>
                  <td>{companyRoleLabel(company.company_role ?? "both")}</td>
                  <td>{company.sector ?? "-"}</td>
                  <td>{company.city ?? "-"}</td>
                  <td>{company.country ?? "-"}</td>
                  <td>
                    {buckets.traded.length === 0 ? (
                      <span className="small">-</span>
                    ) : (
                      <div className="tag-list">
                        {buckets.traded.map((name) => (
                          <span className="tag tag-traded" key={`${company.id}-traded-${name}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {buckets.potential.length === 0 ? (
                      <span className="small">-</span>
                    ) : (
                      <div className="tag-list">
                        {buckets.potential.map((name) => (
                          <span className="tag tag-potential" key={`${company.id}-potential-${name}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => startEdit(company)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void deleteCompany(company.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
