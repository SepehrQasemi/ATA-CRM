"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { PaginationControls } from "@/components/pagination-controls";
import { PageTip } from "@/components/page-tip";
import { useLocale } from "@/components/locale-provider";
import { Product, ProductCompanyLink } from "@/lib/types";
import { startsWithSuggestions } from "@/lib/search-suggestions";

type CompanyOption = {
  id: string;
  name: string;
  company_role: "supplier" | "customer" | "both";
  sector: string | null;
  city?: string | null;
  country?: string | null;
};
type CompanyAgent = {
  id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  agent_rank: number | null;
};
type ProductsResponse = {
  products: Product[];
  companies: CompanyOption[];
  links: ProductCompanyLink[];
  agents: CompanyAgent[];
  error?: string;
};

type ProductFilters = { q: string; category: string; is_active: string; relation_type: string };
type ProductForm = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  default_purchase_price: string;
  default_sale_price: string;
  is_active: boolean;
  notes: string;
};
type RelationForm = {
  product_id: string;
  company_id: string;
  relation_type: "traded" | "potential";
  product_model: string;
  last_price: string;
  notes: string;
};
type ProductWorkspaceTab = "list" | "create" | "relations" | "finder";

const initialFilters: ProductFilters = { q: "", category: "", is_active: "", relation_type: "" };
const initialForm: ProductForm = {
  name: "",
  sku: "",
  category: "",
  unit: "kg",
  default_purchase_price: "",
  default_sale_price: "",
  is_active: true,
  notes: "",
};
const initialRelationForm: RelationForm = {
  product_id: "",
  company_id: "",
  relation_type: "traded",
  product_model: "",
  last_price: "",
  notes: "",
};
const PER_PAGE = 20;

function relationLabel(value: "traded" | "potential", tr: (key: string) => string) {
  return value === "traded" ? tr("Traded") : tr("Potential");
}

function companyRoleLabel(role: "supplier" | "customer" | "both", tr: (key: string) => string) {
  if (role === "supplier") return tr("Supplier");
  if (role === "customer") return tr("Customer");
  return tr("Supplier + Customer");
}

export default function ProductsPage() {
  const { tr } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [links, setLinks] = useState<ProductCompanyLink[]>([]);
  const [agents, setAgents] = useState<CompanyAgent[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [relationForm, setRelationForm] = useState<RelationForm>(initialRelationForm);
  const [finderProductId, setFinderProductId] = useState("");
  const [finderRelation, setFinderRelation] = useState<"" | "traded" | "potential">("");
  const [finderModel, setFinderModel] = useState("");
  const [activeTab, setActiveTab] = useState<ProductWorkspaceTab>("list");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingRelation, setSavingRelation] = useState(false);
  const [page, setPage] = useState(1);

  async function loadData(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.category.trim()) params.set("category", activeFilters.category.trim());
    if (activeFilters.is_active) params.set("is_active", activeFilters.is_active);
    if (activeFilters.relation_type) params.set("relation_type", activeFilters.relation_type);

    const response = await fetch(`/api/products${params.toString() ? `?${params.toString()}` : ""}`);
    const json = (await response.json()) as ProductsResponse;
    if (!response.ok) {
      setError(json.error ?? "Failed to load products");
      return;
    }

    setProducts(json.products ?? []);
    setCompanies(json.companies ?? []);
    setLinks(json.links ?? []);
    setAgents(json.agents ?? []);
    setPage(1);

    if (!relationForm.product_id && (json.products?.length ?? 0) > 0) {
      setRelationForm((prev) => ({ ...prev, product_id: json.products![0].id }));
    }
    if (!finderProductId && (json.products?.length ?? 0) > 0) {
      setFinderProductId(json.products![0].id);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyById = useMemo(() => Object.fromEntries(companies.map((item) => [item.id, item])), [companies]);
  const agentsByCompany = useMemo(() => {
    const map: Record<string, CompanyAgent[]> = {};
    agents.forEach((agent) => {
      if (!agent.company_id) return;
      if (!map[agent.company_id]) map[agent.company_id] = [];
      map[agent.company_id].push(agent);
    });
    return map;
  }, [agents]);
  const productSearchSuggestions = useMemo(
    () => startsWithSuggestions(products.map((product) => product.name), filters.q, 5),
    [products, filters.q],
  );
  const visibleProducts = useMemo(() => {
    if (!filters.relation_type) return products;
    const ids = new Set(links.filter((l) => l.relation_type === filters.relation_type).map((l) => l.product_id));
    return products.filter((p) => ids.has(p.id));
  }, [filters.relation_type, links, products]);
  const customerSuggestions = useMemo(() => {
    if (!finderProductId) return [];
    const model = finderModel.trim().toLowerCase();
    return links
      .filter((l) => l.product_id === finderProductId)
      .filter((l) => (finderRelation ? l.relation_type === finderRelation : true))
      .filter((l) => (model ? (l.product_model ?? "").toLowerCase().includes(model) : true))
      .map((link) => ({
        link,
        company: companyById[link.company_id],
        agents: (agentsByCompany[link.company_id] ?? []).slice(0, 3),
      }))
      .filter((item) => Boolean(item.company));
  }, [finderModel, finderProductId, finderRelation, links, companyById, agentsByCompany]);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        sku: form.sku || null,
        category: form.category || null,
        default_purchase_price: Number(form.default_purchase_price || 0),
        default_sale_price: Number(form.default_sale_price || 0),
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to save product");
      setSaving(false);
      return;
    }
    setForm(initialForm);
    setSaving(false);
    setSuccess("Product created");
    setActiveTab("list");
    void loadData();
  }

  async function saveRelation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRelation(true);
    setError(null);
    if (!relationForm.product_id || !relationForm.company_id || !relationForm.product_model.trim()) {
      setError("Product, company and model are required");
      setSavingRelation(false);
      return;
    }
    const response = await fetch(`/api/products/${relationForm.product_id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: relationForm.company_id,
        relation_type: relationForm.relation_type,
        product_model: relationForm.product_model.trim(),
        last_price: relationForm.last_price ? Number(relationForm.last_price) : null,
        notes: relationForm.notes || null,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to save relation");
      setSavingRelation(false);
      return;
    }
    setRelationForm((prev) => ({ ...prev, company_id: "", product_model: "", last_price: "", notes: "" }));
    setSavingRelation(false);
    setSuccess("Product relation saved");
    void loadData();
  }

  async function deleteRelation(link: ProductCompanyLink) {
    const response = await fetch(`/api/products/${link.product_id}/links/${link.id}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to delete relation");
      return;
    }
    setSuccess("Relation deleted");
    void loadData();
  }

  async function createLeadFromProductMatch(link: ProductCompanyLink) {
    const product = products.find((item) => item.id === link.product_id);
    const company = companyById[link.company_id];
    if (!product || !company) return;
    const topAgent = (agentsByCompany[link.company_id] ?? [])[0];
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Product match - ${product.name} - ${company.name}`,
        source: "Product match",
        estimated_value: link.last_price ? Number(link.last_price) * 10 : 0,
        company_id: company.id,
        contact_id: topAgent?.id ?? null,
        notes: `Relation: ${link.relation_type}; model: ${link.product_model || "-"}`,
      }),
    });
    if (!response.ok) {
      setError("Failed to create lead from product match");
      return;
    }
    setSuccess("Lead created from product match");
  }

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PER_PAGE));
  const visibleProductsPage = visibleProducts.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const tradedCount = links.filter((l) => l.relation_type === "traded").length;
  const potentialCount = links.filter((l) => l.relation_type === "potential").length;

  return (
    <div className="stack">
      <PageTip id="tip-products-buckets" title={tr("Quick onboarding")} detail={tr("For each company, keep both traded history and potential product links updated.")} />
      <section className="page-head">
        <h1>{tr("Products")}</h1>
        <p>{tr("Manage your product catalog and classify each company relation as traded history or potential opportunity.")}</p>
      </section>

      <section className="card-grid">
        <article className="card"><p className="muted">{tr("Products")}</p><p className="kpi">{visibleProducts.length}</p></article>
        <article className="card"><p className="muted">{tr("Traded links")}</p><p className="kpi">{tradedCount}</p></article>
        <article className="card"><p className="muted">{tr("Potential links")}</p><p className="kpi">{potentialCount}</p></article>
        <article className="card"><p className="muted">{tr("Active products")}</p><p className="kpi">{visibleProducts.filter((p) => p.is_active).length}</p></article>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <section className="panel stack">
        <div className="subtabs" role="tablist" aria-label="Products workspace tabs">
          <button className={`subtab ${activeTab === "list" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "list"} onClick={() => setActiveTab("list")}>{tr("Product list")}</button>
          <button className={`subtab ${activeTab === "create" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "create"} onClick={() => setActiveTab("create")}>{tr("New product")}</button>
          <button className={`subtab ${activeTab === "relations" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "relations"} onClick={() => setActiveTab("relations")}>{tr("Product relations")}</button>
          <button className={`subtab ${activeTab === "finder" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "finder"} onClick={() => setActiveTab("finder")}>{tr("Customer finder")}</button>
        </div>
      </section>

      {activeTab === "list" ? (
        <section className="panel stack">
          <h2>{tr("Product filters")}</h2>
          <form className="row" onSubmit={(e) => { e.preventDefault(); setError(null); setSuccess(null); void loadData(filters); }}>
            <label className="col-5 stack">{tr("Search")}<AutocompleteInput value={filters.q} onChange={(v) => setFilters((p) => ({ ...p, q: v }))} placeholder={tr("Product name")} suggestions={productSearchSuggestions} listId="product-search-suggestions" /></label>
            <label className="col-4 stack">{tr("Category")}<input value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))} /></label>
            <label className="col-3 stack">{tr("Active")}<select value={filters.is_active} onChange={(e) => setFilters((p) => ({ ...p, is_active: e.target.value }))}><option value="">{tr("All")}</option><option value="true">{tr("Active")}</option><option value="false">{tr("Inactive")}</option></select></label>
            <div className="col-12 inline-actions action-end"><button className="btn btn-secondary" type="submit">{tr("Apply")}</button><button className="btn" type="button" onClick={() => { setFilters(initialFilters); void loadData(initialFilters); }}>{tr("Clear")}</button></div>
          </form>
        </section>
      ) : null}

      {activeTab === "create" ? (
        <section className="panel stack">
          <h2>{tr("New product")}</h2>
          <form className="stack" onSubmit={saveProduct}>
            <div className="row">
              <label className="col-3 stack">{tr("Name")}<input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></label>
              <label className="col-2 stack">SKU<input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} /></label>
              <label className="col-2 stack">{tr("Category")}<input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} /></label>
              <label className="col-1 stack">Unit<input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} /></label>
              <label className="col-2 stack">{tr("Purchase price")}<input type="number" value={form.default_purchase_price} onChange={(e) => setForm((p) => ({ ...p, default_purchase_price: e.target.value }))} /></label>
              <label className="col-2 stack">{tr("Sale price")}<input type="number" value={form.default_sale_price} onChange={(e) => setForm((p) => ({ ...p, default_sale_price: e.target.value }))} /></label>
              <label className="col-2 stack">{tr("Active")}<select value={form.is_active ? "true" : "false"} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === "true" }))}><option value="true">{tr("Yes")}</option><option value="false">{tr("No")}</option></select></label>
              <label className="col-10 stack">{tr("Notes")}<textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? tr("Saving...") : tr("Create product")}</button>
          </form>
        </section>
      ) : null}

      {activeTab === "list" ? (
        <section className="panel stack">
          <h2>{tr("Product list")}</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{tr("Name")}</th><th>{tr("Category")}</th><th>{tr("Prices")}</th><th>{tr("Actions")}</th></tr></thead>
              <tbody>
                {visibleProductsPage.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}<div className="small">{`Unit: ${product.unit}`}</div></td>
                    <td>{product.category ?? "-"}</td>
                    <td><div className="small">{`Buy: ${Number(product.default_purchase_price || 0).toLocaleString()} EUR`}</div><div className="small">{`Sell: ${Number(product.default_sale_price || 0).toLocaleString()} EUR`}</div></td>
                    <td><Link className="btn btn-secondary" href={`/products/${product.id}`}>{tr("View details")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      ) : null}

      {activeTab === "relations" ? (
        <section className="panel stack">
          <h2>{tr("Product-company relations")}</h2>
          <form className="stack" onSubmit={saveRelation}>
            <div className="row">
              <label className="col-3 stack">{tr("Product")}<select value={relationForm.product_id} onChange={(e) => setRelationForm((p) => ({ ...p, product_id: e.target.value }))} required><option value="">{tr("Select product")}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label className="col-3 stack">{tr("Company")}<select value={relationForm.company_id} onChange={(e) => setRelationForm((p) => ({ ...p, company_id: e.target.value }))} required><option value="">{tr("Select company")}</option>{companies.map((c) => <option key={c.id} value={c.id}>{`${c.name} (${companyRoleLabel(c.company_role, tr)})`}</option>)}</select></label>
              <label className="col-2 stack">{tr("Category")}<select value={relationForm.relation_type} onChange={(e) => setRelationForm((p) => ({ ...p, relation_type: e.target.value as "traded" | "potential" }))}><option value="traded">{tr("Traded")}</option><option value="potential">{tr("Potential")}</option></select></label>
              <label className="col-2 stack">{tr("Model / Grade")}<input value={relationForm.product_model} onChange={(e) => setRelationForm((p) => ({ ...p, product_model: e.target.value }))} required /></label>
              <label className="col-2 stack">{tr("Last price")}<input type="number" value={relationForm.last_price} onChange={(e) => setRelationForm((p) => ({ ...p, last_price: e.target.value }))} /></label>
            </div>
            <label className="stack">{tr("Notes")}<textarea value={relationForm.notes} onChange={(e) => setRelationForm((p) => ({ ...p, notes: e.target.value }))} /></label>
            <button className="btn btn-primary" type="submit" disabled={savingRelation}>{savingRelation ? tr("Saving...") : tr("Save relation")}</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{tr("Product")}</th><th>{tr("Company")}</th><th>{tr("Category")}</th><th>{tr("Model / Grade")}</th><th>{tr("Last price")}</th><th>{tr("Top agents")}</th><th>{tr("Actions")}</th></tr></thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>{products.find((p) => p.id === link.product_id)?.name ?? "-"}</td>
                    <td>{companyById[link.company_id]?.name ?? "-"}</td>
                    <td>{relationLabel(link.relation_type, tr)}</td>
                    <td>{link.product_model || "-"}</td>
                    <td>{link.last_price == null ? "-" : `${Number(link.last_price).toLocaleString()} EUR`}</td>
                    <td>{(agentsByCompany[link.company_id] ?? []).slice(0, 3).map((agent) => `${agent.first_name} ${agent.last_name}`).join(", ") || "-"}</td>
                    <td><button className="btn btn-danger" type="button" onClick={() => void deleteRelation(link)}>{tr("Delete")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "finder" ? (
        <section className="panel stack">
          <h2>{tr("Customer finder by product")}</h2>
          <form className="row" onSubmit={(e) => e.preventDefault()}>
            <label className="col-4 stack">{tr("Product for customer search")}<select value={finderProductId} onChange={(e) => setFinderProductId(e.target.value)}><option value="">{tr("Select product")}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="col-3 stack">{tr("Relation focus")}<select value={finderRelation} onChange={(e) => setFinderRelation(e.target.value as "" | "traded" | "potential")}><option value="">{tr("All")}</option><option value="traded">{tr("Traded")}</option><option value="potential">{tr("Potential")}</option></select></label>
            <label className="col-5 stack">{tr("Model contains")}<input value={finderModel} onChange={(e) => setFinderModel(e.target.value)} /></label>
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{tr("Company")}</th><th>{tr("Relation")}</th><th>{tr("Model / Grade")}</th><th>{tr("Location")}</th><th>{tr("Top agents")}</th><th>{tr("Actions")}</th></tr></thead>
              <tbody>
                {customerSuggestions.map(({ link, company, agents: topAgents }) => (
                  <tr key={`finder-${link.id}`}>
                    <td>{company?.name ?? "-"}</td>
                    <td>{relationLabel(link.relation_type, tr)}</td>
                    <td>{link.product_model || "-"}</td>
                    <td>{[company?.city, company?.country].filter(Boolean).join(", ") || "-"}</td>
                    <td>{topAgents.map((agent) => `${agent.first_name} ${agent.last_name}`).join(", ") || "-"}</td>
                    <td><button className="btn btn-secondary" type="button" onClick={() => void createLeadFromProductMatch(link)}>{tr("Create lead")}</button></td>
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
