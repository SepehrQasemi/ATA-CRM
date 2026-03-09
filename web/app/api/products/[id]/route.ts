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
