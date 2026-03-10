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
  const companyQuery = url.searchParams.get("company_q")?.trim() ?? "";

  const query = supabaseAdmin
    .from("contacts")
    .select("id,first_name,last_name,email,phone,job_title,notes,company_id,is_company_agent,agent_rank,created_at,owner_id")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query.eq("owner_id", user.id);
  }

  if (companyId) {
    query.eq("company_id", companyId);
  } else if (companyQuery) {
    const companyLookup = supabaseAdmin
      .from("companies")
      .select("id")
      .ilike("name", `${companyQuery}%`)
      .limit(50);

    if (!isAdmin) {
      companyLookup.or(`owner_id.eq.${user.id},owner_id.is.null`);
    }

    const { data: matchingCompanies, error: companiesError } = await companyLookup;
    if (companiesError) {
      return fail("Failed to load companies for contact filter", 500, companiesError.message);
    }

    const companyIds = (matchingCompanies ?? []).map((company) => company.id);
    if (companyIds.length === 0) {
      return ok({ contacts: [] });
    }

    query.in("company_id", companyIds);
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

  const isCompanyAgent = body.is_company_agent === true || body.is_company_agent === "true";
  let agentRank: number | null = null;
  if (body.agent_rank !== undefined && body.agent_rank !== null && String(body.agent_rank) !== "") {
    const rank = Number(body.agent_rank);
    if (!Number.isInteger(rank) || rank < 1 || rank > 3) {
      return fail("agent_rank must be 1, 2, or 3", 400);
    }
    agentRank = rank;
  }
  if (isCompanyAgent && agentRank === null) {
    agentRank = 1;
  }
  if (!isCompanyAgent) {
    agentRank = null;
  }

  const payload = {
    first_name: String(body.first_name),
    last_name: String(body.last_name),
    email: body.email ? String(body.email) : null,
    phone: body.phone ? String(body.phone) : null,
    job_title: body.job_title ? String(body.job_title) : null,
    notes: body.notes ? String(body.notes) : null,
    company_id: body.company_id ? String(body.company_id) : null,
    is_company_agent: isCompanyAgent,
    agent_rank: agentRank,
    owner_id: user.id,
  };

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert(payload)
    .select("id,first_name,last_name,email,phone,job_title,notes,company_id,is_company_agent,agent_rank,created_at")
    .single();

  if (error) return fail("Failed to create contact", 500, error.message);
  return ok({ contact: data }, 201);
}
