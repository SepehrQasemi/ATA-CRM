import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const companyOwnershipFilter = (userId: string) => `owner_id.eq.${userId},owner_id.is.null`;
const RELATION_TYPES = new Set(["traded", "potential"]);

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const category = (url.searchParams.get("category") ?? "").trim();
  const relationType = url.searchParams.get("relation_type");
  const activeParam = url.searchParams.get("is_active");

  const productsQuery = supabaseAdmin
    .from("products")
    .select(
      "id,name,sku,category,unit,default_purchase_price,default_sale_price,is_active,notes,owner_id,created_at",
    )
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    productsQuery.eq("owner_id", user.id);
  }

  if (q) {
    productsQuery.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  }

  if (category) {
    productsQuery.ilike("category", `%${category}%`);
  }

  if (activeParam === "true") {
    productsQuery.eq("is_active", true);
  } else if (activeParam === "false") {
    productsQuery.eq("is_active", false);
  }

  const companyQuery = supabaseAdmin
    .from("companies")
    .select("id,name,company_role,sector,owner_id")
    .order("name", { ascending: true });

  if (!isAdmin) {
    companyQuery.or(companyOwnershipFilter(user.id));
  }

  const linksQuery = supabaseAdmin
    .from("product_company_links")
    .select("id,product_id,company_id,relation_type,last_price,notes,owner_id,created_at")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    linksQuery.eq("owner_id", user.id);
  }

  if (relationType && RELATION_TYPES.has(relationType)) {
    linksQuery.eq("relation_type", relationType);
  }

  const [{ data: products, error: productsError }, { data: companies, error: companiesError }, { data: links, error: linksError }] =
    await Promise.all([productsQuery, companyQuery, linksQuery]);

  if (productsError) return fail("Failed to load products", 500, productsError.message);
  if (companiesError) return fail("Failed to load companies", 500, companiesError.message);
  if (linksError) return fail("Failed to load product links", 500, linksError.message);

  return ok({
    products: products ?? [],
    companies: companies ?? [],
    links: links ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.name || !String(body.name).trim()) return fail("name is required", 400);

  const payload = {
    name: String(body.name).trim(),
    sku: body.sku ? String(body.sku).trim() || null : null,
    category: body.category ? String(body.category).trim() || null : null,
    unit: body.unit ? String(body.unit).trim() || "kg" : "kg",
    default_purchase_price: Number(body.default_purchase_price || 0),
    default_sale_price: Number(body.default_sale_price || 0),
    is_active: body.is_active === false ? false : true,
    notes: body.notes ? String(body.notes) : null,
    owner_id: user.id,
  };

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert(payload)
    .select(
      "id,name,sku,category,unit,default_purchase_price,default_sale_price,is_active,notes,owner_id,created_at",
    )
    .single();

  if (error) return fail("Failed to create product", 500, error.message);
  return ok({ product: data }, 201);
}
