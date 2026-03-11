import { requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { id: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const { id } = await params;

  const { data: category, error: categoryError } = await supabaseAdmin
    .from("product_categories")
    .select("id,name,description,created_at")
    .eq("id", id)
    .single();

  if (categoryError || !category) return fail("Category not found", 404);

  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id,name,sku,category,unit,default_purchase_price,default_sale_price,is_active,notes,created_at")
    .eq("category", category.name)
    .order("created_at", { ascending: false });

  if (productsError) return fail("Failed to load category products", 500, productsError.message);

  const productIds = [...new Set((products ?? []).map((product) => product.id))];

  let suppliers: Array<{
    id: string;
    name: string;
    company_role: "supplier" | "customer" | "both";
    sector: string | null;
    city: string | null;
    country: string | null;
  }> = [];
  let customers: Array<{
    id: string;
    name: string;
    company_role: "supplier" | "customer" | "both";
    sector: string | null;
    city: string | null;
    country: string | null;
  }> = [];

  if (productIds.length > 0) {
    const { data: links, error: linksError } = await supabaseAdmin
      .from("product_company_links")
      .select("id,product_id,company_id,relation_type")
      .in("product_id", productIds);

    if (linksError) return fail("Failed to load category links", 500, linksError.message);

    const companyIds = [...new Set((links ?? []).map((link) => link.company_id))];

    if (companyIds.length > 0) {
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from("companies")
        .select("id,name,company_role,sector,city,country")
        .in("id", companyIds)
        .order("name", { ascending: true });

      if (companiesError) return fail("Failed to load category companies", 500, companiesError.message);

      const uniqueById = (rows: typeof companies) =>
        Object.values(
          (rows ?? []).reduce<Record<string, (typeof rows)[number]>>((acc, row) => {
            acc[row.id] = row;
            return acc;
          }, {}),
        );

      suppliers = uniqueById(
        (companies ?? []).filter(
          (company) => company.company_role === "supplier" || company.company_role === "both",
        ),
      );
      customers = uniqueById(
        (companies ?? []).filter(
          (company) => company.company_role === "customer" || company.company_role === "both",
        ),
      );
    }
  }

  return ok({
    category,
    products: products ?? [],
    suppliers,
    customers,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const { id } = await params;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("product_categories")
    .select("id,name")
    .eq("id", id)
    .single();

  if (existingError || !existing) return fail("Category not found", 404);

  const body = (await request.json()) as Record<string, unknown>;
  const nextName = body.name === undefined ? undefined : String(body.name ?? "").trim();
  const nextDescription =
    body.description === undefined ? undefined : body.description ? String(body.description) : null;

  if (nextName !== undefined && !nextName) {
    return fail("name is required", 400);
  }

  const updatePayload = {
    name: nextName,
    description: nextDescription,
  };

  const { data, error } = await supabaseAdmin
    .from("product_categories")
    .update(updatePayload)
    .eq("id", id)
    .select("id,name,description,created_at")
    .single();

  if (error) {
    if (error.code === "23505") return fail("Category name already exists", 409, error.message);
    return fail("Failed to update category", 500, error.message);
  }

  if (nextName && nextName !== existing.name) {
    const { error: syncError } = await supabaseAdmin
      .from("products")
      .update({ category: nextName })
      .eq("category", existing.name);

    if (syncError) return fail("Failed to sync products with new category name", 500, syncError.message);
  }

  const { count } = await supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", data.name);

  return ok({ category: { ...data, product_count: count ?? 0 } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const { id } = await params;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("product_categories")
    .select("id,name")
    .eq("id", id)
    .single();

  if (existingError || !existing) return fail("Category not found", 404);

  const { error: clearProductsError } = await supabaseAdmin
    .from("products")
    .update({ category: null })
    .eq("category", existing.name);

  if (clearProductsError) return fail("Failed to clear category from products", 500, clearProductsError.message);

  const { error } = await supabaseAdmin
    .from("product_categories")
    .delete()
    .eq("id", id);

  if (error) return fail("Failed to delete category", 500, error.message);
  return ok({ deleted: true });
}
