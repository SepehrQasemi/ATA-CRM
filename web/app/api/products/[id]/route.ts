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
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";
  const { id } = await params;

  const allowed = await ensureAccess(id, user.id, isAdmin);
  if (!allowed) return fail("Forbidden", 403);

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

  if (!isAdmin) {
    linksQuery.eq("owner_id", user.id);
  }

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

  if (companyIds.length > 0) {
    const companiesQuery = supabaseAdmin
      .from("companies")
      .select("id,name,company_role,sector,city,country,owner_id")
      .in("id", companyIds);

    if (!isAdmin) {
      companiesQuery.or(`owner_id.eq.${user.id},owner_id.is.null`);
    }

    const agentsQuery = supabaseAdmin
      .from("contacts")
      .select("id,company_id,first_name,last_name,email,phone,job_title,agent_rank,owner_id")
      .in("company_id", companyIds)
      .eq("is_company_agent", true)
      .order("agent_rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (!isAdmin) {
      agentsQuery.eq("owner_id", user.id);
    }

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

  return ok({
    product,
    links: links ?? [],
    companies,
    agents,
  });
}

export async function PATCH(
  request: Request,
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

  const body = (await request.json()) as Record<string, unknown>;
  const payload = {
    name: body.name ? String(body.name).trim() : undefined,
    sku: body.sku === null ? null : body.sku ? String(body.sku).trim() : undefined,
    category:
      body.category === null ? null : body.category ? String(body.category).trim() : undefined,
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
