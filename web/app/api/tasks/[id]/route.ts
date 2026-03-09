import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function ensureAccess(taskId: string, userId: string, isAdmin: boolean) {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("id,owner_id,assigned_to")
    .eq("id", taskId)
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
  const statusValue = body.status ? String(body.status) : undefined;

  const payload = {
    title: body.title ? String(body.title) : undefined,
    description:
      body.description === null ? null : body.description ? String(body.description) : undefined,
    due_date:
      body.due_date === null
        ? null
        : body.due_date
          ? new Date(body.due_date).toISOString()
          : undefined,
    priority: body.priority ? String(body.priority) : undefined,
    status: statusValue,
    assigned_to:
      body.assigned_to === null ? null : body.assigned_to ? String(body.assigned_to) : undefined,
    lead_id: body.lead_id === null ? null : body.lead_id ? String(body.lead_id) : undefined,
    company_id:
      body.company_id === null ? null : body.company_id ? String(body.company_id) : undefined,
    contact_id:
      body.contact_id === null ? null : body.contact_id ? String(body.contact_id) : undefined,
    completed_at: statusValue === "done" ? new Date().toISOString() : undefined,
  };

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(payload)
    .eq("id", id)
    .select(
      "id,title,description,due_date,priority,status,assigned_to,lead_id,company_id,contact_id,created_at",
    )
    .single();

  if (error) return fail("Failed to update task", 500, error.message);
  return ok({ task: data });
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

  const { error } = await supabaseAdmin.from("tasks").delete().eq("id", id);
  if (error) return fail("Failed to delete task", 500, error.message);
  return ok({ deleted: true });
}
