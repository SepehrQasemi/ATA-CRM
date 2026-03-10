"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { PaginationControls } from "@/components/pagination-controls";
import { PageTip } from "@/components/page-tip";
import { useLocale } from "@/components/locale-provider";
import { Company } from "@/lib/types";
import { startsWithSuggestions } from "@/lib/search-suggestions";

type ProductOption = { id: string; name: string };
type CompanyProductLink = {
  id: string;
  company_id: string;
  product_id: string;
  relation_type: "traded" | "potential";
  product_model: string;
};
type CompanyAgent = {
  id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  agent_rank: number | null;
};

type CompaniesResponse = {
  companies: Company[];
  products: ProductOption[];
  links: CompanyProductLink[];
  agents: CompanyAgent[];
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
type CompanyWorkspaceTab = "list" | "create";
const PER_PAGE = 20;

function companyRoleLabel(
  role: "supplier" | "customer" | "both",
  tr: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (role === "supplier") return tr("Supplier");
  if (role === "customer") return tr("Customer");
  return tr("Supplier + Customer");
}

export default function CompaniesPage() {
  const { tr } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [links, setLinks] = useState<CompanyProductLink[]>([]);
  const [agents, setAgents] = useState<CompanyAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [filters, setFilters] = useState<CompanyFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<CompanyWorkspaceTab>("list");
  const [page, setPage] = useState(1);

  async function loadCompanies(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.sector.trim()) params.set("sector", activeFilters.sector.trim());
    if (activeFilters.company_role.trim()) params.set("company_role", activeFilters.company_role.trim());

    const query = params.toString();
    const response = await fetch(`/api/companies${query ? `?${query}` : ""}`);
    const json = (await response.json()) as CompaniesResponse;

    if (!response.ok) {
      setError(json.error ?? tr("Failed to load companies"));
      return;
    }

    setCompanies(json.companies ?? []);
    setProducts(json.products ?? []);
    setLinks(json.links ?? []);
    setAgents(json.agents ?? []);
    setPage(1);
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
      const productName = productById[link.product_id]?.name ?? tr("Product");
      const modelSuffix = link.product_model ? ` (${link.product_model})` : "";
      const displayLabel = `${productName}${modelSuffix}`;
      if (link.relation_type === "traded") {
        map[link.company_id].traded.push(displayLabel);
      } else {
        map[link.company_id].potential.push(displayLabel);
      }
    });
    Object.values(map).forEach((bucket) => {
      bucket.traded = [...new Set(bucket.traded)];
      bucket.potential = [...new Set(bucket.potential)];
    });
    return map;
  }, [links, productById, tr]);

  const agentsByCompany = useMemo(() => {
    const map: Record<string, CompanyAgent[]> = {};
    agents.forEach((agent) => {
      if (!agent.company_id) return;
      if (!map[agent.company_id]) {
        map[agent.company_id] = [];
      }
      map[agent.company_id].push(agent);
    });
    Object.values(map).forEach((items) => {
      items.sort((a, b) => (a.agent_rank ?? 99) - (b.agent_rank ?? 99));
    });
    return map;
  }, [agents]);

  const companySearchSuggestions = useMemo(
    () => startsWithSuggestions(companies.map((company) => company.name), filters.q, 5),
    [companies, filters.q],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? tr("Failed to save company"));
      setSaving(false);
      return;
    }

    setForm(initialForm);
    setSaving(false);
    setActiveTab("list");
    void loadCompanies();
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    void loadCompanies(filters);
  }

  const totalPages = Math.max(1, Math.ceil(companies.length / PER_PAGE));
  const visibleCompanies = companies.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="stack">
      <PageTip
        id="tip-companies-role-products"
        title={tr("Quick onboarding")}
        detail={tr("Set company role first, then track traded and potential products for sales context.")}
      />
      <section className="page-head">
        <h1>{tr("Companies")}</h1>
        <p>{tr("Manage partner companies, define their role, and track traded/potential product buckets.")}</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <div className="subtabs" role="tablist" aria-label={tr("Companies workspace tabs")}>
          <button
            className={`subtab ${activeTab === "list" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "list"}
            onClick={() => setActiveTab("list")}
          >
            {tr("Company list")}
          </button>
          <button
            className={`subtab ${activeTab === "create" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            onClick={() => setActiveTab("create")}
          >
            {tr("New company")}
          </button>
        </div>
      </section>

      {activeTab === "list" ? (
        <section className="panel stack">
          <h2>{tr("Company filters")}</h2>
          <form className="row" onSubmit={handleFilterSubmit}>
            <label className="col-4 stack">
              {tr("Search (name)")}
              <AutocompleteInput
                value={filters.q}
                onChange={(nextValue) => setFilters((prev) => ({ ...prev, q: nextValue }))}
                placeholder={tr("Company name")}
                suggestions={companySearchSuggestions}
                listId="company-search-suggestions"
              />
            </label>
            <label className="col-4 stack">
              {tr("Sector")}
              <input
                value={filters.sector}
                onChange={(event) => setFilters((prev) => ({ ...prev, sector: event.target.value }))}
                placeholder={tr("Food Ingredients")}
              />
            </label>
            <label className="col-2 stack">
              {tr("Role")}
              <select
                value={filters.company_role}
                onChange={(event) => setFilters((prev) => ({ ...prev, company_role: event.target.value }))}
              >
                <option value="">{tr("All")}</option>
                <option value="supplier">{tr("Supplier")}</option>
                <option value="customer">{tr("Customer")}</option>
                <option value="both">{tr("Supplier + Customer")}</option>
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
                  setFilters(initialFilters);
                  void loadCompanies(initialFilters);
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
          <h2>{tr("New company")}</h2>
          <form className="stack" onSubmit={handleSubmit}>
            <div className="row">
              <label className="col-3 stack">
                {tr("Name")}
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>
              <label className="col-3 stack">
                {tr("Company role")}
                <select
                  value={form.company_role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      company_role: e.target.value as "supplier" | "customer" | "both",
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
                  onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))}
                />
              </label>
              <label className="col-3 stack">
                {tr("City")}
                <input
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </label>
              <label className="col-3 stack">
                {tr("Country")}
                <input
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                />
              </label>
              <label className="col-3 stack">
                {tr("Website")}
                <input
                  value={form.website}
                  onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                />
              </label>
              <label className="col-6 stack">
                {tr("Notes")}
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
            </div>
            <div className="inline-actions">
              <button className="btn btn-primary" disabled={saving} type="submit">
                {saving ? tr("Saving...") : tr("Create company")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {activeTab === "list" ? (
        <section className="panel stack">
          <h2>{tr("Company list")}</h2>
          <div className="table-wrap">
            <table className="company-table">
              <thead>
                <tr>
                  <th>{tr("Name")}</th>
                  <th>{tr("Role")}</th>
                  <th>{tr("Sector")}</th>
                  <th>{tr("Location")}</th>
                  <th>{tr("Agents")}</th>
                  <th>{tr("Products summary")}</th>
                  <th>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleCompanies.map((company) => {
                  const buckets = productBucketsByCompany[company.id] ?? { traded: [], potential: [] };
                  return (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>{companyRoleLabel(company.company_role ?? "both", tr)}</td>
                      <td>{company.sector ?? "-"}</td>
                      <td>{[company.city, company.country].filter(Boolean).join(", ") || "-"}</td>
                      <td>
                        {(agentsByCompany[company.id] ?? []).slice(0, 3).length === 0 ? (
                          <span className="small">-</span>
                        ) : (
                          <div className="stack">
                            {(agentsByCompany[company.id] ?? []).slice(0, 3).map((agent) => (
                                <span key={agent.id} className="small">
                                {`${tr("Agent")} ${agent.agent_rank ?? "-"}: ${agent.first_name} ${agent.last_name}`}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="stack">
                          <span className="small">{`${tr("Traded")}: ${buckets.traded.length}`}</span>
                          <span className="small">{`${tr("Potential")}: ${buckets.potential.length}`}</span>
                        </div>
                      </td>
                      <td>
                        <Link className="btn btn-secondary" href={`/companies/${company.id}`}>
                          {tr("View details")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      ) : null}
    </div>
  );
}
