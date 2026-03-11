"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PaginationControls } from "@/components/pagination-controls";
import { useLocale } from "@/components/locale-provider";
import { Company, Product, ProductCategory } from "@/lib/types";

type CategoryDetailResponse = {
  category?: ProductCategory;
  products?: Product[];
  suppliers?: Company[];
  customers?: Company[];
  error?: string;
};

const PER_PAGE = 10;

export default function CategoryProfilePage() {
  const { tr } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [suppliersPage, setSuppliersPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/product-categories/${id}`, { cache: "no-store" });
    const json = (await response.json()) as CategoryDetailResponse;
    if (!response.ok || !json.category) {
      setError(json.error ?? tr("Failed to load category"));
      setLoading(false);
      return;
    }

    setCategory(json.category);
    setName(json.category.name);
    setDescription(json.category.description ?? "");
    setProducts(json.products ?? []);
    setSuppliers(json.suppliers ?? []);
    setCustomers(json.customers ?? []);
    setProductsPage(1);
    setSuppliersPage(1);
    setCustomersPage(1);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pagedProducts = useMemo(
    () => products.slice((productsPage - 1) * PER_PAGE, productsPage * PER_PAGE),
    [products, productsPage],
  );
  const pagedSuppliers = useMemo(
    () => suppliers.slice((suppliersPage - 1) * PER_PAGE, suppliersPage * PER_PAGE),
    [suppliers, suppliersPage],
  );
  const pagedCustomers = useMemo(
    () => customers.slice((customersPage - 1) * PER_PAGE, customersPage * PER_PAGE),
    [customers, customersPage],
  );

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/product-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      category?: ProductCategory;
      error?: string;
    };
    if (!response.ok || !json.category) {
      setError(json.error ?? tr("Failed to update category"));
      setSaving(false);
      return;
    }

    setCategory(json.category);
    setName(json.category.name);
    setDescription(json.category.description ?? "");
    setSuccess(tr("Category updated."));
    setSaving(false);
    setEditing(false);
    void loadData();
  }

  async function deleteCategory() {
    if (!id) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/product-categories/${id}`, { method: "DELETE" });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? tr("Failed to delete category"));
      setDeleting(false);
      return;
    }

    router.push("/categories");
    router.refresh();
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Category profile")}</h1>
        <p>{tr("View category details, products, suppliers, and customers in one place.")}</p>
      </section>

      <div className="inline-actions">
        <Link className="btn btn-secondary" href="/categories">
          {tr("Back to categories")}
        </Link>
        {category && !editing ? (
          <button className="btn btn-primary" type="button" onClick={() => setEditing(true)}>
            {tr("Edit")}
          </button>
        ) : null}
      </div>

      {loading ? <p className="small">{tr("Loading data...")}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      {category && !editing ? (
        <section className="panel stack">
          <h2>{category.name}</h2>
          <p>{category.description ?? "-"}</p>
        </section>
      ) : null}

      {category && editing ? (
        <section className="panel stack">
          <h2>{tr("Edit category")}</h2>
          <form className="stack" onSubmit={saveCategory}>
            <div className="row">
              <label className="col-4 stack">
                {tr("Name")}
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label className="col-8 stack">
                {tr("Description")}
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
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
                  if (category) {
                    setName(category.name);
                    setDescription(category.description ?? "");
                  }
                  setEditing(false);
                }}
              >
                {tr("Cancel edit")}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                disabled={deleting}
                onClick={() => void deleteCategory()}
              >
                {deleting ? tr("Processing...") : tr("Delete")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {category ? (
        <section className="panel stack">
          <h2>{tr("Products in this category")}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Name")}</th>
                  <th>{tr("SKU")}</th>
                  <th>{tr("Unit")}</th>
                  <th>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku ?? "-"}</td>
                    <td>{product.unit}</td>
                    <td className="table-action-cell">
                      <Link className="btn btn-secondary btn-detail" href={`/products/${product.id}`}>
                        {tr("View details")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={productsPage}
            totalPages={Math.max(1, Math.ceil(products.length / PER_PAGE))}
            onPageChange={setProductsPage}
          />
        </section>
      ) : null}

      {category ? (
        <section className="panel stack">
          <h2>{tr("Suppliers in this category")}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Name")}</th>
                  <th>{tr("Sector")}</th>
                  <th>{tr("Location")}</th>
                  <th>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pagedSuppliers.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.sector ?? "-"}</td>
                    <td>{[company.city, company.country].filter(Boolean).join(", ") || "-"}</td>
                    <td className="table-action-cell">
                      <Link className="btn btn-secondary btn-detail" href={`/companies/${company.id}`}>
                        {tr("View details")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={suppliersPage}
            totalPages={Math.max(1, Math.ceil(suppliers.length / PER_PAGE))}
            onPageChange={setSuppliersPage}
          />
        </section>
      ) : null}

      {category ? (
        <section className="panel stack">
          <h2>{tr("Customers in this category")}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Name")}</th>
                  <th>{tr("Sector")}</th>
                  <th>{tr("Location")}</th>
                  <th>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pagedCustomers.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.sector ?? "-"}</td>
                    <td>{[company.city, company.country].filter(Boolean).join(", ") || "-"}</td>
                    <td className="table-action-cell">
                      <Link className="btn btn-secondary btn-detail" href={`/companies/${company.id}`}>
                        {tr("View details")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={customersPage}
            totalPages={Math.max(1, Math.ceil(customers.length / PER_PAGE))}
            onPageChange={setCustomersPage}
          />
        </section>
      ) : null}
    </div>
  );
}
