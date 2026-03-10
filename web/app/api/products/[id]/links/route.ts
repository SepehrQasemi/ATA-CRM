import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const RELATION_TYPES = new Set(["traded", "potential"]);

async function ensureProductAccess(productId: string, userId: string, isAdmin: boolean) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,owner_id")
    .eq("id", productId)
    .single();

  if (error || !data) return false;
  if (isAdmin) return true;
  return data.owner_id === userId;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";
  const { id } = await params;

  const allowed = await ensureProductAccess(id, user.id, isAdmin);
  if (!allowed) return fail("Forbidden", 403);

  const body = (await request.json()) as Record<string, unknown>;
  const companyId = body.company_id ? String(body.company_id) : "";
  const relationType = body.relation_type ? String(body.relation_type) : "";
  if (!companyId) return fail("company_id is required", 400);
  if (!RELATION_TYPES.has(relationType)) {
    return fail("relation_type must be traded or potential", 400);
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id,owner_id")
    .eq("id", companyId)
    .single();

  if (companyError || !company) return fail("Company not found", 404);
  if (!isAdmin && company.owner_id && company.owner_id !== user.id) {
    return fail("Forbidden", 403);
  }

  const payload = {
    product_id: id,
    company_id: companyId,
    relation_type: relationType,
    product_model: body.product_model ? String(body.product_model).trim() : "",
    last_price:
      body.last_price === null
        ? null
        : body.last_price !== undefined
          ? Number(body.last_price || 0)
          : null,
    notes: body.notes ? String(body.notes) : null,
    owner_id: user.id,
  };

  const { data, error } = await supabaseAdmin
    .from("product_company_links")
    .upsert(payload, { onConflict: "product_id,company_id,relation_type,product_model" })
    .select("id,product_id,company_id,relation_type,product_model,last_price,notes,owner_id,created_at")
    .single();

  if (error) return fail("Failed to save product link", 500, error.message);
  return ok({ link: data }, 201);
}

