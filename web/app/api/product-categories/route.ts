import { requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const pageRaw = Number(url.searchParams.get("page") ?? "1");
  const perPageRaw = Number(url.searchParams.get("per_page") ?? "20");
  const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
  const perPage = Number.isFinite(perPageRaw) ? Math.min(Math.max(perPageRaw, 1), 50) : 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const query = supabaseAdmin
    .from("product_categories")
    .select("id,name,description,created_at", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  if (q) {
    query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data: categories, error, count } = await query;
  if (error) return fail("Failed to load categories", 500, error.message);

  const names = (categories ?? []).map((category) => category.name);
  let productCountByCategory: Record<string, number> = {};

  if (names.length > 0) {
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id,category")
      .in("category", names);

    if (productsError) return fail("Failed to load category product counts", 500, productsError.message);

    productCountByCategory = (products ?? []).reduce<Record<string, number>>((acc, row) => {
      const key = row.category ?? "";
      if (!key) return acc;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }

  return ok({
    categories: (categories ?? []).map((category) => ({
      ...category,
      product_count: productCountByCategory[category.name] ?? 0,
    })),
    total: count ?? 0,
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil((count ?? 0) / perPage)),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const body = (await request.json()) as Record<string, unknown>;
  const name = body.name ? String(body.name).trim() : "";
  const description = body.description ? String(body.description).trim() : null;

  if (!name) return fail("name is required", 400);

  const { data, error } = await supabaseAdmin
    .from("product_categories")
    .insert({
      name,
      description,
      owner_id: user.id,
    })
    .select("id,name,description,created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return fail("Category name already exists", 409, error.message);
    }
    return fail("Failed to create category", 500, error.message);
  }

  return ok({ category: { ...data, product_count: 0 } }, 201);
}
