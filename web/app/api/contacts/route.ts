import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? url.searchParams.get("search");
  const companyId = url.searchParams.get("company_id");

  const query = supabaseAdmin
    .from("contacts")
    .select("id,first_name,last_name,email,phone,job_title,notes,company_id,created_at,owner_id")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query.eq("owner_id", user.id);
  }

  if (companyId) {
    query.eq("company_id", companyId);
  }

  if (search) {
    query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;
  if (error) return fail("Failed to load contacts", 500, error.message);
  return ok({ contacts: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const body = await request.json();
  if (!body.first_name || !body.last_name) {
    return fail("first_name and last_name are required", 400);
  }

  const payload = {
    first_name: String(body.first_name),
    last_name: String(body.last_name),
    email: body.email ? String(body.email) : null,
    phone: body.phone ? String(body.phone) : null,
    job_title: body.job_title ? String(body.job_title) : null,
    notes: body.notes ? String(body.notes) : null,
    company_id: body.company_id ? String(body.company_id) : null,
    owner_id: user.id,
  };

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert(payload)
    .select("id,first_name,last_name,email,phone,job_title,notes,company_id,created_at")
    .single();

  if (error) return fail("Failed to create contact", 500, error.message);
  return ok({ contact: data }, 201);
}
