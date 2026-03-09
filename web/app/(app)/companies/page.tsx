"use client";

import { FormEvent, useEffect, useState } from "react";
import { Company } from "@/lib/types";

type CompaniesResponse = { companies: Company[]; error?: string };

type CompanyForm = {
  name: string;
  sector: string;
  city: string;
  country: string;
  website: string;
  notes: string;
};

const initialForm: CompanyForm = {
  name: "",
  sector: "Food Ingredients",
  city: "",
  country: "",
  website: "",
  notes: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [filters, setFilters] = useState({ q: "", sector: "" });

  async function loadCompanies(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.sector.trim()) params.set("sector", activeFilters.sector.trim());

    const query = params.toString();
    const response = await fetch(`/api/companies${query ? `?${query}` : ""}`);
    const json = (await response.json()) as CompaniesResponse;

    if (!response.ok) {
      setError(json.error ?? "Failed to load companies");
      return;
    }

    setCompanies(json.companies ?? []);
  }

  useEffect(() => {
    void loadCompanies();
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
        <p>Manage partner companies and suppliers.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Company filters</h2>
        <form className="row" onSubmit={handleFilterSubmit}>
          <label className="col-5 stack">
            Search (name)
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Search by company name"
            />
          </label>
          <label className="col-5 stack">
            Sector
            <input
              value={filters.sector}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, sector: event.target.value }))
              }
              placeholder="Food Ingredients"
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
                const cleared = { q: "", sector: "" };
                setFilters(cleared);
                void loadCompanies(cleared);
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
            <label className="col-4 stack">
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label className="col-4 stack">
              Sector
              <input
                value={form.sector}
                onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              City
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              Country
              <input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              Website
              <input
                value={form.website}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              />
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
              <th>Sector</th>
              <th>City</th>
              <th>Country</th>
              <th>Website</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id}>
                <td>{company.name}</td>
                <td>{company.sector ?? "-"}</td>
                <td>{company.city ?? "-"}</td>
                <td>{company.country ?? "-"}</td>
                <td>{company.website ?? "-"}</td>
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
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
