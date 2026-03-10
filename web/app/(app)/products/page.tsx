"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageTip } from "@/components/page-tip";
import { useLocale } from "@/components/locale-provider";
import { Product, ProductCompanyLink } from "@/lib/types";

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
  email: string | null;
  phone: string | null;
  job_title: string | null;
  agent_rank: number | null;
};

type ProductsResponse = {
  products: Product[];
  companies: CompanyOption[];
  links: ProductCompanyLink[];
  agents: CompanyAgent[];
  error?: string;
};

type ProductFilters = {
  q: string;
  category: string;
  is_active: string;
  relation_type: string;
};

const initialFilters: ProductFilters = {
  q: "",
  category: "",
  is_active: "",
  relation_type: "",
};

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

type RelationForm = {
  product_id: string;
  company_id: string;
  relation_type: "traded" | "potential";
  product_model: string;
  last_price: string;
  notes: string;
};

const initialRelationForm: RelationForm = {
  product_id: "",
  company_id: "",
  relation_type: "traded",
  product_model: "",
  last_price: "",
  notes: "",
};

function relationLabel(
  value: "traded" | "potential",
  tr: (key: string, vars?: Record<string, string | number>) => string,
) {
  return value === "traded" ? tr("Traded") : tr("Potential");
}

function companyRoleLabel(
  role: "supplier" | "customer" | "both",
  tr: (key: string, vars?: Record<string, string | number>) => string,
) {
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingRelation, setSavingRelation] = useState(false);

  async function loadData(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.category.trim()) params.set("category", activeFilters.category.trim());
    if (activeFilters.is_active) params.set("is_active", activeFilters.is_active);
    if (activeFilters.relation_type) params.set("relation_type", activeFilters.relation_type);

    const query = params.toString();
    const response = await fetch(`/api/products${query ? `?${query}` : ""}`);
    const json = (await response.json()) as ProductsResponse;
    if (!response.ok) {
      setError(json.error ?? "Failed to load products");
      return;
    }

    setProducts(json.products ?? []);
    setCompanies(json.companies ?? []);
    setLinks(json.links ?? []);
    setAgents(json.agents ?? []);

    if (!relationForm.product_id && (json.products?.length ?? 0) > 0) {
      setRelationForm((prev) => ({ ...prev, product_id: json.products[0].id }));
    }
    if (!finderProductId && (json.products?.length ?? 0) > 0) {
      setFinderProductId(json.products[0].id);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyById = useMemo(() => {
    const map: Record<string, CompanyOption> = {};
    companies.forEach((company) => {
      map[company.id] = company;
    });
    return map;
  }, [companies]);

  const linksByProduct = useMemo(() => {
    const map: Record<string, ProductCompanyLink[]> = {};
    links.forEach((link) => {
      if (!map[link.product_id]) map[link.product_id] = [];
      map[link.product_id].push(link);
    });
    return map;
  }, [links]);

  const agentsByCompany = useMemo(() => {
    const map: Record<string, CompanyAgent[]> = {};
    agents.forEach((agent) => {
      if (!agent.company_id) return;
      if (!map[agent.company_id]) map[agent.company_id] = [];
      map[agent.company_id].push(agent);
    });
    Object.values(map).forEach((items) => {
      items.sort((a, b) => (a.agent_rank ?? 99) - (b.agent_rank ?? 99));
    });
    return map;
  }, [agents]);

  const visibleProducts = useMemo(() => {
    if (!filters.relation_type) return products;
    const matchingProductIds = new Set(
      links
        .filter((link) => link.relation_type === filters.relation_type)
        .map((link) => link.product_id),
    );
    return products.filter((product) => matchingProductIds.has(product.id));
  }, [filters.relation_type, links, products]);

  const customerSuggestions = useMemo(() => {
    if (!finderProductId) return [];
    const modelQuery = finderModel.trim().toLowerCase();
    return links
      .filter((link) => link.product_id === finderProductId)
      .filter((link) => (finderRelation ? link.relation_type === finderRelation : true))
      .filter((link) =>
        modelQuery ? (link.product_model ?? "").toLowerCase().includes(modelQuery) : true,
      )
      .map((link) => ({
        link,
        company: companyById[link.company_id],
        agents: (agentsByCompany[link.company_id] ?? []).slice(0, 3),
      }))
      .filter((item) => Boolean(item.company));
  }, [finderModel, finderProductId, finderRelation, links, companyById, agentsByCompany]);

  function resetProductForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const endpoint = editingId ? `/api/products/${editingId}` : "/api/products";
    const method = editingId ? "PATCH" : "POST";
    const response = await fetch(endpoint, {
      method,
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

    setSaving(false);
    setSuccess(editingId ? "Product updated" : "Product created");
    resetProductForm();
    void loadData();
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      category: product.category ?? "",
      unit: product.unit ?? "kg",
      default_purchase_price: String(Number(product.default_purchase_price || 0)),
      default_sale_price: String(Number(product.default_sale_price || 0)),
      is_active: product.is_active,
      notes: product.notes ?? "",
    });
  }

  async function deleteProduct(productId: string) {
    setError(null);
    setSuccess(null);
    const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to delete product");
      return;
    }
    setSuccess("Product deleted");
    if (relationForm.product_id === productId) {
      setRelationForm((prev) => ({ ...prev, product_id: "" }));
    }
    void loadData();
  }

  async function saveRelation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRelation(true);
    setError(null);
    setSuccess(null);

    if (!relationForm.product_id) {
      setError("Select a product first");
      setSavingRelation(false);
      return;
    }
    if (!relationForm.company_id) {
      setError("Select a company first");
      setSavingRelation(false);
      return;
    }
    if (!relationForm.product_model.trim()) {
      setError("Product model/grade is required");
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
        last_price: relationForm.last_price === "" ? null : Number(relationForm.last_price),
        notes: relationForm.notes || null,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to save product relation");
      setSavingRelation(false);
      return;
    }

    setSavingRelation(false);
    setSuccess("Product relation saved");
    setRelationForm((prev) => ({
      ...prev,
      company_id: "",
      product_model: "",
      last_price: "",
      notes: "",
    }));
    void loadData();
  }

  async function deleteRelation(link: ProductCompanyLink) {
    setError(null);
    setSuccess(null);
    const response = await fetch(`/api/products/${link.product_id}/links/${link.id}`, {
      method: "DELETE",
    });
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
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to create lead from product match");
      return;
    }
    setError(null);
    setSuccess("Lead created from product match");
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    void loadData(filters);
  }

  const tradedCount = links.filter((link) => link.relation_type === "traded").length;
  const potentialCount = links.filter((link) => link.relation_type === "potential").length;

  return (
    <div className="stack">
      <PageTip
        id="tip-products-buckets"
        title={tr("Quick onboarding")}
        detail={tr("For each company, keep both traded history and potential product links updated.")}
      />
      <section className="page-head">
        <h1>{tr("Products")}</h1>
        <p>
          {tr("Manage your product catalog and classify each company relation as traded history or potential opportunity.")}
        </p>
      </section>

      <section className="card-grid">
        <article className="card">
          <p className="muted">{tr("Products")}</p>
          <p className="kpi">{visibleProducts.length}</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Traded links")}</p>
          <p className="kpi">{tradedCount}</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Potential links")}</p>
          <p className="kpi">{potentialCount}</p>
        </article>
        <article className="card">
          <p className="muted">{tr("Active products")}</p>
          <p className="kpi">{visibleProducts.filter((product) => product.is_active).length}</p>
        </article>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <section className="panel stack">
        <h2>{tr("Product filters")}</h2>
        <form className="row" onSubmit={applyFilters}>
          <label className="col-4 stack">
            {tr("Search")}
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Product name"
            />
          </label>
          <label className="col-3 stack">
            {tr("Category")}
            <input
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="Cocoa, Dairy..."
            />
          </label>
          <label className="col-2 stack">
            {tr("Active")}
            <select
              value={filters.is_active}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, is_active: event.target.value }))
              }
            >
              <option value="">{tr("All")}</option>
              <option value="true">{tr("Active")}</option>
              <option value="false">{tr("Inactive")}</option>
            </select>
          </label>
          <label className="col-2 stack">
            {tr("Product relation")}
            <select
              value={filters.relation_type}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, relation_type: event.target.value }))
              }
            >
              <option value="">{tr("All")}</option>
              <option value="traded">{tr("Traded")}</option>
              <option value="potential">{tr("Potential")}</option>
            </select>
          </label>
          <div className="col-1 stack action-end">
            <button className="btn btn-secondary" type="submit">
              {tr("Apply")}
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

      <section className="panel stack">
        <h2>Customer finder by product</h2>
        <p className="small">
          Find companies that already traded this product or have potential demand, with their top 1-3 agents.
        </p>
        <form className="row" onSubmit={(event) => event.preventDefault()}>
          <label className="col-4 stack">
            Product for customer search
            <select
              value={finderProductId}
              onChange={(event) => setFinderProductId(event.target.value)}
            >
              <option value="">{tr("Select product")}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col-3 stack">
            Relation focus
            <select
              value={finderRelation}
              onChange={(event) =>
                setFinderRelation(event.target.value as "" | "traded" | "potential")
              }
            >
              <option value="">{tr("All")}</option>
              <option value="traded">{tr("Traded")}</option>
              <option value="potential">{tr("Potential")}</option>
            </select>
          </label>
          <label className="col-5 stack">
            Model contains
            <input
              value={finderModel}
              onChange={(event) => setFinderModel(event.target.value)}
              placeholder="E1422, kappa, instant..."
            />
          </label>
        </form>

        <h3>Suggested customer companies</h3>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Relation</th>
              <th>Model / Grade</th>
              <th>Sector</th>
              <th>Location</th>
              <th>Top agents</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {customerSuggestions.map(({ link, company, agents: topAgents }) => (
              <tr key={`suggestion-${link.id}`}>
                <td>{company?.name ?? "-"}</td>
                <td>{relationLabel(link.relation_type, tr)}</td>
                <td>{link.product_model || "-"}</td>
                <td>{company?.sector ?? "-"}</td>
                <td>{[company?.city, company?.country].filter(Boolean).join(", ") || "-"}</td>
                <td>
                  {topAgents.length === 0 ? (
                    <span className="small">-</span>
                  ) : (
                    <div className="stack">
                      {topAgents.map((agent) => (
                        <span key={agent.id} className="small">
                          {`#${agent.agent_rank ?? "-"} ${agent.first_name} ${agent.last_name}`}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => void createLeadFromProductMatch(link)}
                  >
                    Create lead
                  </button>
                </td>
              </tr>
            ))}
            {customerSuggestions.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <span className="small">No matching companies yet.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{editingId ? tr("Edit product") : tr("New product")}</h2>
        <form className="stack" onSubmit={saveProduct}>
          <div className="row">
            <label className="col-3 stack">
              {tr("Name")}
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label className="col-2 stack">
              SKU
              <input
                value={form.sku}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
              />
            </label>
            <label className="col-2 stack">
              {tr("Category")}
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
              />
            </label>
            <label className="col-1 stack">
              Unit
              <input
                value={form.unit}
                onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </label>
            <label className="col-2 stack">
              Purchase price
              <input
                type="number"
                value={form.default_purchase_price}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, default_purchase_price: event.target.value }))
                }
              />
            </label>
            <label className="col-2 stack">
              Sale price
              <input
                type="number"
                value={form.default_sale_price}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, default_sale_price: event.target.value }))
                }
              />
            </label>
            <label className="col-2 stack">
              {tr("Active")}
              <select
                value={form.is_active ? "true" : "false"}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_active: event.target.value === "true" }))
                }
              >
                <option value="true">{tr("Yes")}</option>
                <option value="false">{tr("No")}</option>
              </select>
            </label>
            <label className="col-10 stack">
              {tr("Notes")}
              <input
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? tr("Saving...") : editingId ? tr("Update product") : tr("Create product")}
            </button>
            {editingId ? (
              <button className="btn btn-secondary" type="button" onClick={resetProductForm}>
                {tr("Cancel edit")}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>{tr("Product list")}</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Prices</th>
              <th>Relations</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => {
              const related = linksByProduct[product.id] ?? [];
              return (
                <tr key={product.id}>
                  <td>
                    {product.name}
                    <div className="small">Unit: {product.unit}</div>
                  </td>
                  <td>{product.sku ?? "-"}</td>
                  <td>{product.category ?? "-"}</td>
                  <td>
                    <div className="small">
                      Buy: {Number(product.default_purchase_price || 0).toLocaleString()} EUR
                    </div>
                    <div className="small">
                      Sell: {Number(product.default_sale_price || 0).toLocaleString()} EUR
                    </div>
                  </td>
                  <td>
                    {related.length === 0 ? (
                      <span className="small">No links</span>
                    ) : (
                      <div className="tag-list">
                        {related.map((link) => (
                          <span key={link.id} className={`tag tag-${link.relation_type}`}>
                            {relationLabel(link.relation_type, tr)}:{" "}
                            {companyById[link.company_id]?.name ?? "Company"}
                            {link.product_model ? ` (${link.product_model})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="inline-actions">
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => startEdit(product)}
                      >
                      {tr("Edit")}
                      </button>
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() => void deleteProduct(product.id)}
                      >
                        {tr("Delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>{tr("Product-company relations")}</h2>
        <form className="stack" onSubmit={saveRelation}>
          <div className="row">
            <label className="col-3 stack">
              {tr("Product")}
              <select
                value={relationForm.product_id}
                onChange={(event) =>
                  setRelationForm((prev) => ({ ...prev, product_id: event.target.value }))
                }
                required
              >
                <option value="">{tr("Select product")}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              {tr("Company")}
              <select
                value={relationForm.company_id}
                onChange={(event) =>
                  setRelationForm((prev) => ({ ...prev, company_id: event.target.value }))
                }
                required
              >
                <option value="">{tr("Select company")}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({companyRoleLabel(company.company_role, tr)})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-2 stack">
              {tr("Category")}
              <select
                value={relationForm.relation_type}
                onChange={(event) =>
                  setRelationForm((prev) => ({
                    ...prev,
                    relation_type: event.target.value as "traded" | "potential",
                  }))
                }
              >
                <option value="traded">{tr("Traded")}</option>
                <option value="potential">{tr("Potential")}</option>
              </select>
            </label>
            <label className="col-2 stack">
              Model / Grade
              <input
                value={relationForm.product_model}
                onChange={(event) =>
                  setRelationForm((prev) => ({ ...prev, product_model: event.target.value }))
                }
                placeholder="E1422, Kappa, 80 mesh..."
                required
              />
            </label>
            <label className="col-2 stack">
              Last price
              <input
                type="number"
                value={relationForm.last_price}
                onChange={(event) =>
                  setRelationForm((prev) => ({ ...prev, last_price: event.target.value }))
                }
              />
            </label>
          </div>
          <label className="stack">
              {tr("Notes")}
              <input
                value={relationForm.notes}
                onChange={(event) =>
                  setRelationForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
          </label>
          <button className="btn btn-primary" type="submit" disabled={savingRelation}>
            {savingRelation ? tr("Saving...") : tr("Save relation")}
          </button>
        </form>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Company</th>
              <th>Category</th>
              <th>Model / Grade</th>
              <th>Last price</th>
              <th>Notes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                <td>{products.find((product) => product.id === link.product_id)?.name ?? "-"}</td>
                <td>{companyById[link.company_id]?.name ?? "-"}</td>
                <td>{relationLabel(link.relation_type, tr)}</td>
                <td>{link.product_model || "-"}</td>
                <td>{link.last_price == null ? "-" : `${Number(link.last_price).toLocaleString()} EUR`}</td>
                <td>{link.notes ?? "-"}</td>
                <td>
                  <button className="btn btn-danger" type="button" onClick={() => void deleteRelation(link)}>
                    {tr("Delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
