import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function ensureAccess(leadId: string, userId: string, isAdmin: boolean) {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id,owner_id,assigned_to")
    .eq("id", leadId)
    .single();

  if (error || !data) return false;
  if (isAdmin) return true;
  return data.owner_id === userId || data.assigned_to === userId;
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
  const assignedToValue =
    body.assigned_to === null ? null : body.assigned_to ? String(body.assigned_to) : undefined;
  const payload = {
    title: body.title ? String(body.title) : undefined,
    source: body.source === null ? null : body.source ? String(body.source) : undefined,
    status: body.status ? String(body.status) : undefined,
    estimated_value:
      body.estimated_value === undefined ? undefined : Number(body.estimated_value),
    company_id:
      body.company_id === null ? null : body.company_id ? String(body.company_id) : undefined,
    contact_id:
      body.contact_id === null ? null : body.contact_id ? String(body.contact_id) : undefined,
    assigned_to: isAdmin ? assignedToValue : undefined,
    current_stage_id:
      body.current_stage_id === null
        ? null
        : body.current_stage_id
          ? String(body.current_stage_id)
          : undefined,
    notes: body.notes === null ? null : body.notes ? String(body.notes) : undefined,
    last_activity_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("leads")
    .update(payload)
    .eq("id", id)
    .select(
      "id,title,source,status,estimated_value,company_id,contact_id,assigned_to,current_stage_id,last_activity_at,owner_id,notes,created_at,updated_at",
    )
    .single();

  if (error) return fail("Failed to update lead", 500, error.message);
  return ok({ lead: data });
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

  const { error } = await supabaseAdmin.from("leads").delete().eq("id", id);
  if (error) return fail("Failed to delete lead", 500, error.message);
  return ok({ deleted: true });
}
