"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PaginationControls } from "@/components/pagination-controls";
import { PageTip } from "@/components/page-tip";
import { useLocale } from "@/components/locale-provider";
import { ProductCategory } from "@/lib/types";

type CategoriesResponse = {
  categories: ProductCategory[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  error?: string;
};

type CategoryForm = {
  name: string;
  description: string;
};

type CategoryTab = "list" | "new";

const PER_PAGE = 10;

export default function CategoriesPage() {
  const { tr } = useLocale();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTab>("list");
  const [form, setForm] = useState<CategoryForm>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(nextPage),
      per_page: String(PER_PAGE),
    });
    if (nextQuery.trim()) params.set("q", nextQuery.trim());

    const response = await fetch(`/api/product-categories?${params.toString()}`, {
      cache: "no-store",
    });
    const json = (await response.json()) as CategoriesResponse;

    if (!response.ok) {
      setError(json.error ?? tr("Failed to load categories"));
      setLoading(false);
      return;
    }

    setCategories(json.categories ?? []);
    setPage(json.page ?? nextPage);
    setTotalPages(json.total_pages ?? 1);
    setLoading(false);
  }

  useEffect(() => {
    void loadData(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/product-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? tr("Failed to create category"));
      setSaving(false);
      return;
    }

    setForm({ name: "", description: "" });
    setSaving(false);
    setSuccess(tr("Category created."));
    setActiveTab("list");
    void loadData(1, query);
  }

  return (
    <div className="stack">
      <PageTip
        id="tip-categories"
        title={tr("Quick onboarding")}
        detail={tr("Create clear product categories, then assign each product to one category for cleaner analytics.")}
      />

      <section className="page-head">
        <h1>{tr("Categories")}</h1>
        <p>{tr("Manage product categories and keep descriptions aligned with your catalog.")}</p>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <section className="panel stack">
        <div className="subtabs" role="tablist" aria-label={tr("Category workspace tabs")}>
          <button
            className={`subtab ${activeTab === "list" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "list"}
            onClick={() => setActiveTab("list")}
          >
            {tr("Category list")}
          </button>
          <button
            className={`subtab ${activeTab === "new" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "new"}
            onClick={() => setActiveTab("new")}
          >
            {tr("New category")}
          </button>
        </div>
      </section>

      {activeTab === "list" ? (
        <>
          <section className="panel stack">
            <h2>{tr("Category filters")}</h2>
            <form
              className="row"
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                void loadData(1, query);
              }}
            >
              <label className="col-8 stack">
                {tr("Search")}
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={tr("Category name")}
                />
              </label>
              <div className="col-4 stack action-end">
                <button className="btn btn-secondary" type="submit">
                  {tr("Apply")}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setQuery("");
                    void loadData(1, "");
                  }}
                >
                  {tr("Clear")}
                </button>
              </div>
            </form>
          </section>

          <section className="panel stack">
            <h2>{tr("Category list")}</h2>
            {loading ? <p className="small">{tr("Loading data...")}</p> : null}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tr("Name")}</th>
                    <th>{tr("Description")}</th>
                    <th>{tr("Products")}</th>
                    <th>{tr("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{category.description ?? "-"}</td>
                      <td>{category.product_count ?? 0}</td>
                      <td className="table-action-cell">
                        <Link className="btn btn-secondary btn-detail" href={`/categories/${category.id}`}>
                          {tr("View details")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                void loadData(nextPage, query);
              }}
            />
          </section>
        </>
      ) : null}

      {activeTab === "new" ? (
        <section className="panel stack">
          <h2>{tr("New category")}</h2>
          <form className="stack" onSubmit={createCategory}>
            <div className="row">
              <label className="col-4 stack">
                {tr("Name")}
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="col-8 stack">
                {tr("Description")}
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? tr("Saving...") : tr("Create category")}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
