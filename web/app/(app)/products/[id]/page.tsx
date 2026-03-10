"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { Company, Product } from "@/lib/types";

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

type ProductLink = {
  id: string;
  product_id: string;
  company_id: string;
  relation_type: "traded" | "potential";
  product_model: string;
  last_price: number | null;
  notes: string | null;
};

type ProductDetailResponse = {
  product?: Product;
  links?: ProductLink[];
  companies?: Array<{
    id: string;
    name: string;
    company_role: "supplier" | "customer" | "both";
    sector: string | null;
    city: string | null;
    country: string | null;
  }>;
  agents?: CompanyAgent[];
  error?: string;
};

type CompaniesResponse = { companies: Company[]; error?: string };

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
  company_id: string;
  relation_type: "traded" | "potential";
  product_model: string;
  last_price: string;
  notes: string;
};

const initialProductForm: ProductForm = {
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

export default function ProductProfilePage() {
  const { tr } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const [product, setProduct] = useState<Product | null>(null);
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [relationCompanies, setRelationCompanies] = useState<ProductDetailResponse["companies"]>([]);
  const [agents, setAgents] = useState<CompanyAgent[]>([]);
  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm);
  const [relationForm, setRelationForm] = useState<RelationForm>(initialRelationForm);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingRelation, setSavingRelation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function syncProductForm(nextProduct: Product) {
    setProductForm({
      name: nextProduct.name,
      sku: nextProduct.sku ?? "",
      category: nextProduct.category ?? "",
      unit: nextProduct.unit ?? "kg",
      default_purchase_price: String(Number(nextProduct.default_purchase_price || 0)),
      default_sale_price: String(Number(nextProduct.default_sale_price || 0)),
      is_active: nextProduct.is_active,
      notes: nextProduct.notes ?? "",
    });
  }

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError(null);

    const [productRes, companiesRes] = await Promise.all([
      fetch(`/api/products/${id}`, { cache: "no-store" }),
      fetch("/api/companies", { cache: "no-store" }),
    ]);

    const productJson = (await productRes.json()) as ProductDetailResponse;
    const companiesJson = (await companiesRes.json()) as CompaniesResponse;

    if (!productRes.ok || !productJson.product) {
      setError(productJson.error ?? tr("Failed to load product"));
      setLoading(false);
      return;
    }

    setProduct(productJson.product);
    syncProductForm(productJson.product);
    setLinks(productJson.links ?? []);
    setRelationCompanies(productJson.companies ?? []);
    setAgents(productJson.agents ?? []);

    if (companiesRes.ok) {
      setCompanies(companiesJson.companies ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const companyById = useMemo(() => {
    const map: Record<string, Company> = {};
    companies.forEach((company) => {
      map[company.id] = company;
    });
    return map;
  }, [companies]);

  const agentsByCompany = useMemo(() => {
    const map: Record<string, CompanyAgent[]> = {};
    agents.forEach((agent) => {
      if (!agent.company_id) return;
      if (!map[agent.company_id]) map[agent.company_id] = [];
      map[agent.company_id].push(agent);
    });
    return map;
  }, [agents]);

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...productForm,
        default_purchase_price: Number(productForm.default_purchase_price || 0),
        default_sale_price: Number(productForm.default_sale_price || 0),
      }),
    });

    const json = (await response.json()) as { product?: Product; error?: string };
    if (!response.ok || !json.product) {
      setError(json.error ?? tr("Failed to update product"));
      setSaving(false);
      return;
    }

    setProduct(json.product);
    syncProductForm(json.product);
    setSuccess(tr("Product updated."));
    setSaving(false);
    setEditing(false);
  }

  async function handleDeleteProduct() {
    if (!id) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? tr("Failed to delete product"));
      setDeleting(false);
      return;
    }

    router.push("/products");
    router.refresh();
  }

  async function handleSaveRelation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;

    setSavingRelation(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/products/${id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...relationForm,
        last_price: relationForm.last_price ? Number(relationForm.last_price) : null,
      }),
    });

    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? tr("Failed to save relation"));
      setSavingRelation(false);
      return;
    }

    setSuccess(tr("Product relation saved"));
    setSavingRelation(false);
    setRelationForm(initialRelationForm);
    void loadData();
  }

  async function handleDeleteRelation(linkId: string) {
    if (!id) return;
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/products/${id}/links/${linkId}`, {
      method: "DELETE",
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? tr("Failed to delete relation"));
      return;
    }

    setSuccess(tr("Relation deleted"));
    void loadData();
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Product profile")}</h1>
        <p>{tr("View and update product information in one place.")}</p>
      </section>

      <div className="inline-actions">
        <Link className="btn btn-secondary" href="/products">
          {tr("Back to products")}
        </Link>
        {product && !editing ? (
          <button className="btn btn-primary" type="button" onClick={() => setEditing(true)}>
            {tr("Edit")}
          </button>
        ) : null}
      </div>

      {loading ? <p className="small">{tr("Loading data...")}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      {product && !editing ? (
        <>
          <section className="panel stack">
            <h2>{product.name}</h2>
            <div className="row">
              <div className="stack col-3">
                <p className="small">{tr("SKU")}</p>
                <p>{product.sku ?? "-"}</p>
              </div>
              <div className="stack col-3">
                <p className="small">{tr("Category")}</p>
                <p>{product.category ?? "-"}</p>
              </div>
              <div className="stack col-2">
                <p className="small">{tr("Unit")}</p>
                <p>{product.unit}</p>
              </div>
              <div className="stack col-2">
                <p className="small">{tr("Active")}</p>
                <p>{product.is_active ? tr("Yes") : tr("No")}</p>
              </div>
              <div className="stack col-6">
                <p className="small">{tr("Purchase")}</p>
                <p>{Number(product.default_purchase_price || 0).toLocaleString()}</p>
              </div>
              <div className="stack col-6">
                <p className="small">{tr("Sale")}</p>
                <p>{Number(product.default_sale_price || 0).toLocaleString()}</p>
              </div>
              <div className="stack col-12">
                <p className="small">{tr("Notes")}</p>
                <p>{product.notes ?? "-"}</p>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <h2>{tr("Product-company relations")}</h2>
            {links.length === 0 ? (
              <p className="small">{tr("No data found.")}</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("Company")}</th>
                      <th>{tr("Category")}</th>
                      <th>{tr("Model / Grade")}</th>
                      <th>{tr("Last price")}</th>
                      <th>{tr("Top agents")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => {
                      const companyName =
                        relationCompanies?.find((item) => item.id === link.company_id)?.name ??
                        companyById[link.company_id]?.name ??
                        "-";
                      const topAgents = (agentsByCompany[link.company_id] ?? []).slice(0, 3);
                      return (
                        <tr key={link.id}>
                          <td>{companyName}</td>
                          <td>{relationLabel(link.relation_type, tr)}</td>
                          <td>{link.product_model || "-"}</td>
                          <td>{link.last_price == null ? "-" : Number(link.last_price).toLocaleString()}</td>
                          <td>
                            {topAgents.length === 0
                              ? "-"
                              : topAgents
                                  .map((agent) => `${agent.first_name} ${agent.last_name}`)
                                  .join(", ")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {product && editing ? (
        <>
          <section className="panel stack">
            <h2>{tr("Edit product")}</h2>
            <form className="stack" onSubmit={handleSaveProduct}>
              <div className="row">
                <label className="col-3 stack">
                  {tr("Name")}
                  <input
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="col-2 stack">
                  {tr("SKU")}
                  <input
                    value={productForm.sku}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, sku: event.target.value }))
                    }
                  />
                </label>
                <label className="col-2 stack">
                  {tr("Category")}
                  <input
                    value={productForm.category}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, category: event.target.value }))
                    }
                  />
                </label>
                <label className="col-2 stack">
                  {tr("Unit")}
                  <input
                    value={productForm.unit}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, unit: event.target.value }))
                    }
                  />
                </label>
                <label className="col-3 stack">
                  {tr("Active")}
                  <select
                    value={productForm.is_active ? "true" : "false"}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, is_active: event.target.value === "true" }))
                    }
                  >
                    <option value="true">{tr("Yes")}</option>
                    <option value="false">{tr("No")}</option>
                  </select>
                </label>
                <label className="col-3 stack">
                  {tr("Purchase price")}
                  <input
                    type="number"
                    value={productForm.default_purchase_price}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        default_purchase_price: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="col-3 stack">
                  {tr("Sale price")}
                  <input
                    type="number"
                    value={productForm.default_sale_price}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, default_sale_price: event.target.value }))
                    }
                  />
                </label>
                <label className="col-12 stack">
                  {tr("Notes")}
                  <textarea
                    value={productForm.notes}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
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
                    if (product) syncProductForm(product);
                    setEditing(false);
                  }}
                >
                  {tr("Cancel edit")}
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => void handleDeleteProduct()}
                  disabled={deleting}
                >
                  {deleting ? tr("Processing...") : tr("Delete")}
                </button>
              </div>
            </form>
          </section>

          <section className="panel stack">
            <h2>{tr("Product-company relations")}</h2>
            <form className="stack" onSubmit={handleSaveRelation}>
              <div className="row">
                <label className="col-4 stack">
                  {tr("Company")}
                  <select
                    value={relationForm.company_id}
                    onChange={(event) =>
                      setRelationForm((prev) => ({ ...prev, company_id: event.target.value }))
                    }
                    required
                  >
                    <option value="">{tr("Select company")}</option>
                    {companies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
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
                <label className="col-3 stack">
                  {tr("Model / Grade")}
                  <input
                    value={relationForm.product_model}
                    onChange={(event) =>
                      setRelationForm((prev) => ({ ...prev, product_model: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="col-3 stack">
                  {tr("Last price")}
                  <input
                    type="number"
                    value={relationForm.last_price}
                    onChange={(event) =>
                      setRelationForm((prev) => ({ ...prev, last_price: event.target.value }))
                    }
                  />
                </label>
                <label className="col-12 stack">
                  {tr("Notes")}
                  <textarea
                    value={relationForm.notes}
                    onChange={(event) =>
                      setRelationForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="inline-actions">
                <button className="btn btn-primary" type="submit" disabled={savingRelation}>
                  {savingRelation ? tr("Saving...") : tr("Save relation")}
                </button>
              </div>
            </form>

            {links.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("Company")}</th>
                      <th>{tr("Category")}</th>
                      <th>{tr("Model / Grade")}</th>
                      <th>{tr("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => (
                      <tr key={link.id}>
                        <td>{companyById[link.company_id]?.name ?? "-"}</td>
                        <td>{relationLabel(link.relation_type, tr)}</td>
                        <td>{link.product_model || "-"}</td>
                        <td>
                          <button
                            className="btn btn-danger"
                            type="button"
                            onClick={() => void handleDeleteRelation(link.id)}
                          >
                            {tr("Delete")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
