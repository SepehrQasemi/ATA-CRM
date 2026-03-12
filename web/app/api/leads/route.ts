import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { normalizeStageRows } from "@/lib/pipeline-stage-labels";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FIXED_LEAD_SOURCES = new Set([
  "Trade show",
  "LinkedIn",
  "Existing customer",
  "Referral",
  "Website",
  "Cold call",
  "Inbound",
  "Other",
]);

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const stageId = url.searchParams.get("stage_id");
  const status = url.searchParams.get("status");
  const assignedTo = url.searchParams.get("assigned_to");
  const source = url.searchParams.get("source");
  const queryText = url.searchParams.get("q");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const query = supabaseAdmin
    .from("leads")
    .select(
      "id,title,source,status,estimated_value,company_id,contact_id,assigned_to,current_stage_id,last_activity_at,owner_id,notes,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (stageId) query.eq("current_stage_id", stageId);
  if (status) query.eq("status", status);
  if (assignedTo) query.eq("assigned_to", assignedTo);
  if (source) query.ilike("source", `%${source}%`);
  if (queryText) query.ilike("title", `%${queryText}%`);

  const fromValue = from ? Number(from) : NaN;
  if (!Number.isNaN(fromValue)) query.gte("estimated_value", fromValue);

  const toValue = to ? Number(to) : NaN;
  if (!Number.isNaN(toValue)) query.lte("estimated_value", toValue);

  const [{ data: leads, error }, { data: stages }, { data: contacts }, { data: companies }] =
    await Promise.all([
      query,
      supabaseAdmin.from("pipeline_stages").select("id,name,sort_order,is_closed").order("sort_order"),
      supabaseAdmin.from("contacts").select("id,first_name,last_name,email"),
      supabaseAdmin.from("companies").select("id,name"),
    ]);

  if (error) return fail("Failed to load leads", 500, error.message);

  return ok({
    leads: leads ?? [],
    stages: stages ? normalizeStageRows(stages) : [],
    contacts: contacts ?? [],
    companies: companies ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const body = await request.json();
  if (!body.title) return fail("title is required", 400);
  const source = body.source ? String(body.source).trim() : "";
  const normalizedSource = source || "Trade show";
  if (!FIXED_LEAD_SOURCES.has(normalizedSource)) {
    return fail("source must be a supported lead source", 400);
  }

  const payload = {
    title: String(body.title),
    source: normalizedSource,
    status: "open",
    estimated_value: Number(body.estimated_value || 0),
    company_id: body.company_id ? String(body.company_id) : null,
    contact_id: body.contact_id ? String(body.contact_id) : null,
    assigned_to: isAdmin && body.assigned_to ? String(body.assigned_to) : user.id,
    current_stage_id: body.current_stage_id ? String(body.current_stage_id) : null,
    owner_id: user.id,
    notes: body.notes ? String(body.notes) : null,
    last_activity_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert(payload)
    .select(
      "id,title,source,status,estimated_value,company_id,contact_id,assigned_to,current_stage_id,last_activity_at,owner_id,notes,created_at",
    )
    .single();

  if (error) return fail("Failed to create lead", 500, error.message);
  return ok({ lead: data }, 201);
}
