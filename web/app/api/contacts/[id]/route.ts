import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function ensureAccess(contactId: string, userId: string, isAdmin: boolean) {
  const query = supabaseAdmin
    .from("contacts")
    .select("id,owner_id")
    .eq("id", contactId)
    .single();

  const { data, error } = await query;
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

  const { data: contact, error } = await supabaseAdmin
    .from("contacts")
    .select(
      "id,first_name,last_name,email,phone,job_title,notes,company_id,is_company_agent,agent_rank,created_at",
    )
    .eq("id", id)
    .single();

  if (error || !contact) return fail("Contact not found", 404);

  let company: {
    id: string;
    name: string;
    company_role: "supplier" | "customer" | "both";
  } | null = null;

  if (contact.company_id) {
    const { data: companyRow } = await supabaseAdmin
      .from("companies")
      .select("id,name,company_role")
      .eq("id", contact.company_id)
      .single();
    if (companyRow) company = companyRow;
  }

  return ok({ contact, company });
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
  let agentRank: number | null | undefined = undefined;
  if (body.agent_rank !== undefined) {
    if (body.agent_rank === null || String(body.agent_rank) === "") {
      agentRank = null;
    } else {
      const parsed = Number(body.agent_rank);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
        return fail("agent_rank must be 1, 2, or 3", 400);
      }
      agentRank = parsed;
    }
  }

  const isCompanyAgent =
    body.is_company_agent === undefined
      ? undefined
      : body.is_company_agent === true || body.is_company_agent === "true";

  if (isCompanyAgent === false && agentRank === undefined) {
    agentRank = null;
  }

  const payload = {
    first_name: body.first_name ? String(body.first_name) : undefined,
    last_name: body.last_name ? String(body.last_name) : undefined,
    email: body.email === null ? null : body.email ? String(body.email) : undefined,
    phone: body.phone === null ? null : body.phone ? String(body.phone) : undefined,
    job_title:
      body.job_title === null ? null : body.job_title ? String(body.job_title) : undefined,
    notes: body.notes === null ? null : body.notes ? String(body.notes) : undefined,
    company_id:
      body.company_id === null ? null : body.company_id ? String(body.company_id) : undefined,
    is_company_agent: isCompanyAgent,
    agent_rank: agentRank,
  };

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .update(payload)
    .eq("id", id)
    .select("id,first_name,last_name,email,phone,job_title,notes,company_id,is_company_agent,agent_rank,created_at")
    .single();

  if (error) return fail("Failed to update contact", 500, error.message);
  return ok({ contact: data });
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

  const { error } = await supabaseAdmin.from("contacts").delete().eq("id", id);
  if (error) return fail("Failed to delete contact", 500, error.message);
  return ok({ deleted: true });
}
