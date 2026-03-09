import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { id: string; linkId: string };
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";
  const { id, linkId } = await params;

  const allowed = await ensureProductAccess(id, user.id, isAdmin);
  if (!allowed) return fail("Forbidden", 403);

  const body = (await request.json()) as Record<string, unknown>;
  const relationType = body.relation_type ? String(body.relation_type) : undefined;
  if (relationType && !RELATION_TYPES.has(relationType)) {
    return fail("relation_type must be traded or potential", 400);
  }

  const payload = {
    relation_type: relationType,
    last_price:
      body.last_price === undefined
        ? undefined
        : body.last_price === null
          ? null
          : Number(body.last_price || 0),
    notes: body.notes === undefined ? undefined : body.notes ? String(body.notes) : null,
  };

  const { data, error } = await supabaseAdmin
    .from("product_company_links")
    .update(payload)
    .eq("id", linkId)
    .eq("product_id", id)
    .select("id,product_id,company_id,relation_type,last_price,notes,owner_id,created_at")
    .single();

  if (error) return fail("Failed to update product link", 500, error.message);
  return ok({ link: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";
  const { id, linkId } = await params;

  const allowed = await ensureProductAccess(id, user.id, isAdmin);
  if (!allowed) return fail("Forbidden", 403);

  const { error } = await supabaseAdmin
    .from("product_company_links")
    .delete()
    .eq("id", linkId)
    .eq("product_id", id);

  if (error) return fail("Failed to delete product link", 500, error.message);
  return ok({ deleted: true });
}

