import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function ensureAccess(productId: string, userId: string, isAdmin: boolean) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,owner_id")
    .eq("id", productId)
    .single();

  if (error || !data) return false;
  if (isAdmin) return true;
  return data.owner_id === userId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const { id } = await params;

  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select(
      "id,name,sku,category,unit,default_purchase_price,default_sale_price,is_active,notes,owner_id,created_at",
    )
    .eq("id", id)
    .single();

  if (productError || !product) return fail("Product not found", 404);

  const linksQuery = supabaseAdmin
    .from("product_company_links")
    .select("id,product_id,company_id,relation_type,product_model,last_price,notes,owner_id,created_at")
    .eq("product_id", id)
    .order("created_at", { ascending: false });

  const { data: links, error: linksError } = await linksQuery;
  if (linksError) return fail("Failed to load product links", 500, linksError.message);

  const companyIds = [...new Set((links ?? []).map((link) => link.company_id))];

  let companies: Array<{
    id: string;
    name: string;
    company_role: "supplier" | "customer" | "both";
    sector: string | null;
    city: string | null;
    country: string | null;
  }> = [];
  let categories: Array<{
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  }> = [];
  let categoryInfo: { id: string; name: string; description: string | null } | null = null;
  let agents: Array<{
    id: string;
    company_id: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    agent_rank: number | null;
  }> = [];

  const { data: categoryRows, error: categoriesError } = await supabaseAdmin
    .from("product_categories")
    .select("id,name,description,created_at")
    .order("name", { ascending: true });

  if (categoriesError) return fail("Failed to load categories", 500, categoriesError.message);
  categories = categoryRows ?? [];
  if (product.category) {
    categoryInfo =
      categories.find((category) => category.name === product.category) ?? null;
  }

  if (companyIds.length > 0) {
    const companiesQuery = supabaseAdmin
      .from("companies")
      .select("id,name,company_role,sector,city,country,owner_id")
      .in("id", companyIds);

    const agentsQuery = supabaseAdmin
      .from("contacts")
      .select("id,company_id,first_name,last_name,email,phone,job_title,agent_rank,owner_id")
      .in("company_id", companyIds)
      .eq("is_company_agent", true)
      .order("agent_rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    const [{ data: companyRows, error: companiesError }, { data: agentRows, error: agentsError }] =
      await Promise.all([companiesQuery, agentsQuery]);

    if (companiesError) return fail("Failed to load companies", 500, companiesError.message);
    if (agentsError) return fail("Failed to load company agents", 500, agentsError.message);

    companies = (companyRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      company_role: row.company_role,
      sector: row.sector,
      city: row.city,
      country: row.country,
    }));
    agents = agentRows ?? [];
  }

  const uniqueByCompanyId = (
    rows: typeof companies,
    predicate: (company: (typeof companies)[number]) => boolean,
  ) =>
    Object.values(
      rows.reduce<Record<string, (typeof companies)[number]>>((acc, row) => {
        if (!predicate(row)) return acc;
        acc[row.id] = row;
        return acc;
      }, {}),
    );

  const suppliers = uniqueByCompanyId(
    companies,
    (company) => company.company_role === "supplier" || company.company_role === "both",
  );
  const customers = uniqueByCompanyId(
    companies,
    (company) => company.company_role === "customer" || company.company_role === "both",
  );

  return ok({
    product,
    links: links ?? [],
    companies,
    categories,
    categoryInfo,
    suppliers,
    customers,
    agents,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const { id } = await params;

  const body = (await request.json()) as Record<string, unknown>;
  let categoryValue: string | null | undefined = undefined;
  if (body.category_id !== undefined) {
    const categoryId = body.category_id ? String(body.category_id) : "";
    if (!categoryId) {
      categoryValue = null;
    } else {
      const { data: categoryRow, error: categoryError } = await supabaseAdmin
        .from("product_categories")
        .select("id,name")
        .eq("id", categoryId)
        .single();
      if (categoryError || !categoryRow) return fail("Category not found", 404);
      categoryValue = categoryRow.name;
    }
  } else if (body.category !== undefined) {
    categoryValue = body.category === null ? null : String(body.category || "").trim() || null;
  }

  const payload = {
    name: body.name ? String(body.name).trim() : undefined,
    sku: body.sku === null ? null : body.sku ? String(body.sku).trim() : undefined,
    category: categoryValue,
    unit: body.unit ? String(body.unit).trim() : undefined,
    default_purchase_price:
      body.default_purchase_price !== undefined ? Number(body.default_purchase_price || 0) : undefined,
    default_sale_price:
      body.default_sale_price !== undefined ? Number(body.default_sale_price || 0) : undefined,
    is_active: body.is_active === undefined ? undefined : body.is_active === true,
    notes: body.notes === null ? null : body.notes ? String(body.notes) : undefined,
  };

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(payload)
    .eq("id", id)
    .select(
      "id,name,sku,category,unit,default_purchase_price,default_sale_price,is_active,notes,owner_id,created_at",
    )
    .single();

  if (error) return fail("Failed to update product", 500, error.message);
  return ok({ product: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";
  const { id } = await params;

  const allowed = await ensureAccess(id, user.id, isAdmin);
  if (!allowed) return fail("Forbidden", 403);

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) return fail("Failed to delete product", 500, error.message);
  return ok({ deleted: true });
}
