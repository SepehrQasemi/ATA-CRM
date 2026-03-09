"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Product, ProductCompanyLink } from "@/lib/types";

type CompanyOption = { id: string; name: string; sector: string | null };

type ProductsResponse = {
  products: Product[];
  companies: CompanyOption[];
  links: ProductCompanyLink[];
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
  relation_type: "supplier" | "customer";
  last_price: string;
  notes: string;
};

const initialRelationForm: RelationForm = {
  product_id: "",
  company_id: "",
  relation_type: "supplier",
  last_price: "",
  notes: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [links, setLinks] = useState<ProductCompanyLink[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [relationForm, setRelationForm] = useState<RelationForm>(initialRelationForm);
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

    if (!relationForm.product_id && (json.products?.length ?? 0) > 0) {
      setRelationForm((prev) => ({ ...prev, product_id: json.products[0].id }));
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

  const visibleProducts = useMemo(() => {
    if (!filters.relation_type) return products;
    const matchingProductIds = new Set(
      links
        .filter((link) => link.relation_type === filters.relation_type)
        .map((link) => link.product_id),
    );
    return products.filter((product) => matchingProductIds.has(product.id));
  }, [filters.relation_type, links, products]);

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

    const response = await fetch(`/api/products/${relationForm.product_id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: relationForm.company_id,
        relation_type: relationForm.relation_type,
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

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    void loadData(filters);
  }

  const supplierCount = links.filter((link) => link.relation_type === "supplier").length;
  const customerCount = links.filter((link) => link.relation_type === "customer").length;

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Products</h1>
        <p>
          Manage product catalog and connect each product to customer companies and supplier
          companies.
        </p>
      </section>

      <section className="card-grid">
        <article className="card">
          <p className="muted">Products</p>
          <p className="kpi">{visibleProducts.length}</p>
        </article>
        <article className="card">
          <p className="muted">Supplier links</p>
          <p className="kpi">{supplierCount}</p>
        </article>
        <article className="card">
          <p className="muted">Customer links</p>
          <p className="kpi">{customerCount}</p>
        </article>
        <article className="card">
          <p className="muted">Active products</p>
          <p className="kpi">{visibleProducts.filter((product) => product.is_active).length}</p>
        </article>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <section className="panel stack">
        <h2>Product filters</h2>
        <form className="row" onSubmit={applyFilters}>
          <label className="col-4 stack">
            Search
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Product name"
            />
          </label>
          <label className="col-3 stack">
            Category
            <input
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="Cocoa, Dairy..."
            />
          </label>
          <label className="col-2 stack">
            Active
            <select
              value={filters.is_active}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, is_active: event.target.value }))
              }
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <label className="col-2 stack">
            Relation type
            <select
              value={filters.relation_type}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, relation_type: event.target.value }))
              }
            >
              <option value="">All</option>
              <option value="supplier">Supplier</option>
              <option value="customer">Customer</option>
            </select>
          </label>
          <div className="col-1 stack action-end">
            <button className="btn btn-secondary" type="submit">
              Apply
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                void loadData(initialFilters);
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>{editingId ? "Edit product" : "New product"}</h2>
        <form className="stack" onSubmit={saveProduct}>
          <div className="row">
            <label className="col-3 stack">
              Name
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
              Category
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
              Active
              <select
                value={form.is_active ? "true" : "false"}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_active: event.target.value === "true" }))
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="col-10 stack">
              Notes
              <input
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update product" : "Create product"}
            </button>
            {editingId ? (
              <button className="btn btn-secondary" type="button" onClick={resetProductForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>Product list</h2>
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
                    <div className="small">Buy: {Number(product.default_purchase_price || 0).toLocaleString()} EUR</div>
                    <div className="small">Sell: {Number(product.default_sale_price || 0).toLocaleString()} EUR</div>
                  </td>
                  <td>
                    {related.length === 0 ? (
                      <span className="small">No links</span>
                    ) : (
                      <div className="tag-list">
                        {related.map((link) => (
                          <span key={link.id} className={`tag tag-${link.relation_type}`}>
                            {link.relation_type}: {companyById[link.company_id]?.name ?? "Company"}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="inline-actions">
                      <button className="btn btn-secondary" type="button" onClick={() => startEdit(product)}>
                        Edit
                      </button>
                      <button className="btn btn-danger" type="button" onClick={() => void deleteProduct(product.id)}>
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

      <section className="panel stack">
        <h2>Product-company relations</h2>
        <form className="stack" onSubmit={saveRelation}>
          <div className="row">
            <label className="col-3 stack">
              Product
              <select
                value={relationForm.product_id}
                onChange={(event) =>
                  setRelationForm((prev) => ({ ...prev, product_id: event.target.value }))
                }
                required
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Company
              <select
                value={relationForm.company_id}
                onChange={(event) =>
                  setRelationForm((prev) => ({ ...prev, company_id: event.target.value }))
                }
                required
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-2 stack">
              Relation
              <select
                value={relationForm.relation_type}
                onChange={(event) =>
                  setRelationForm((prev) => ({
                    ...prev,
                    relation_type: event.target.value as "supplier" | "customer",
                  }))
                }
              >
                <option value="supplier">Supplier</option>
                <option value="customer">Customer</option>
              </select>
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
            <label className="col-2 stack">
              Notes
              <input
                value={relationForm.notes}
                onChange={(event) =>
                  setRelationForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingRelation}>
            {savingRelation ? "Saving..." : "Save relation"}
          </button>
        </form>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Company</th>
              <th>Type</th>
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
                <td>{link.relation_type}</td>
                <td>{link.last_price == null ? "-" : `${Number(link.last_price).toLocaleString()} EUR`}</td>
                <td>{link.notes ?? "-"}</td>
                <td>
                  <button className="btn btn-danger" type="button" onClick={() => void deleteRelation(link)}>
                    Delete
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
