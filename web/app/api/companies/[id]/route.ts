import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const COMPANY_ROLES = new Set(["supplier", "customer", "both"]);

async function ensureAccess(companyId: string, userId: string, isAdmin: boolean) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id,owner_id")
    .eq("id", companyId)
    .single();

  if (error || !data) return false;
  if (isAdmin) return true;
  return !data.owner_id || data.owner_id === userId;
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

  const body = await request.json();
  const companyRoleRaw =
    body.company_role === null ? null : body.company_role ? String(body.company_role) : undefined;
  if (companyRoleRaw !== undefined && companyRoleRaw !== null && !COMPANY_ROLES.has(companyRoleRaw)) {
    return fail("company_role must be supplier, customer, or both", 400);
  }

  const payload = {
    name: body.name ? String(body.name) : undefined,
    company_role: companyRoleRaw ?? undefined,
    sector: body.sector === null ? null : body.sector ? String(body.sector) : undefined,
    city: body.city === null ? null : body.city ? String(body.city) : undefined,
    country: body.country === null ? null : body.country ? String(body.country) : undefined,
    website: body.website === null ? null : body.website ? String(body.website) : undefined,
    notes: body.notes === null ? null : body.notes ? String(body.notes) : undefined,
  };

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(payload)
    .eq("id", id)
    .select("id,name,company_role,sector,city,country,website,notes,created_at")
    .single();

  if (error) return fail("Failed to update company", 500, error.message);
  return ok({ company: data });
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

  const { error } = await supabaseAdmin.from("companies").delete().eq("id", id);
  if (error) return fail("Failed to delete company", 500, error.message);
  return ok({ deleted: true });
}
