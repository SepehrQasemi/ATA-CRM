import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ownershipFilter = (userId: string) => `owner_id.eq.${userId},owner_id.is.null`;
const PRODUCT_LINK_TYPES = new Set(["traded", "potential"]);
const COMPANY_ROLES = new Set(["supplier", "customer", "both"]);

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? url.searchParams.get("search");
  const sector = url.searchParams.get("sector");
  const companyRole = url.searchParams.get("company_role");

  const query = supabaseAdmin
    .from("companies")
    .select("id,name,company_role,sector,city,country,website,notes,created_at,owner_id")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query.or(ownershipFilter(user.id));
  }

  if (sector) {
    query.ilike("sector", `%${sector}%`);
  }

  if (companyRole && COMPANY_ROLES.has(companyRole)) {
    if (companyRole === "both") {
      query.eq("company_role", "both");
    } else {
      query.in("company_role", [companyRole, "both"]);
    }
  }

  if (search) {
    query.ilike("name", `%${search}%`);
  }

  const linksQuery = supabaseAdmin
    .from("product_company_links")
    .select("id,product_id,company_id,relation_type,last_price,notes,owner_id,created_at")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    linksQuery.eq("owner_id", user.id);
  }

  const productsQuery = supabaseAdmin
    .from("products")
    .select("id,name")
    .order("name", { ascending: true });

  if (!isAdmin) {
    productsQuery.eq("owner_id", user.id);
  }

  const [
    { data: companies, error: companiesError },
    { data: linksRaw, error: linksError },
    { data: products, error: productsError },
  ] = await Promise.all([query, linksQuery, productsQuery]);

  if (companiesError) return fail("Failed to load companies", 500, companiesError.message);
  if (linksError) return fail("Failed to load company product links", 500, linksError.message);
  if (productsError) return fail("Failed to load products", 500, productsError.message);

  const links = (linksRaw ?? []).filter((link) => PRODUCT_LINK_TYPES.has(link.relation_type));

  return ok({ companies: companies ?? [], links, products: products ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const body = await request.json();
  if (!body.name) return fail("name is required", 400);
  const companyRoleRaw = body.company_role ? String(body.company_role) : "both";
  const companyRole = COMPANY_ROLES.has(companyRoleRaw) ? companyRoleRaw : null;
  if (!companyRole) {
    return fail("company_role must be supplier, customer, or both", 400);
  }

  const { data, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: String(body.name),
      company_role: companyRole,
      sector: body.sector ? String(body.sector) : "Food Ingredients",
      city: body.city ? String(body.city) : null,
      country: body.country ? String(body.country) : null,
      website: body.website ? String(body.website) : null,
      notes: body.notes ? String(body.notes) : null,
      owner_id: user.id,
    })
    .select("id,name,company_role,sector,city,country,website,notes,created_at")
    .single();

  if (error) return fail("Failed to create company", 500, error.message);
  return ok({ company: data }, 201);
}
