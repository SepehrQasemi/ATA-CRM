import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ownershipFilter = (userId: string) => `owner_id.eq.${userId},owner_id.is.null`;

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? url.searchParams.get("search");
  const sector = url.searchParams.get("sector");

  const query = supabaseAdmin
    .from("companies")
    .select("id,name,sector,city,country,website,notes,created_at,owner_id")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query.or(ownershipFilter(user.id));
  }

  if (sector) {
    query.ilike("sector", `%${sector}%`);
  }

  if (search) {
    query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return fail("Failed to load companies", 500, error.message);
  return ok({ companies: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const body = await request.json();
  if (!body.name) return fail("name is required", 400);

  const { data, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: String(body.name),
      sector: body.sector ? String(body.sector) : "Food Ingredients",
      city: body.city ? String(body.city) : null,
      country: body.country ? String(body.country) : null,
      website: body.website ? String(body.website) : null,
      notes: body.notes ? String(body.notes) : null,
      owner_id: user.id,
    })
    .select("id,name,sector,city,country,website,notes,created_at")
    .single();

  if (error) return fail("Failed to create company", 500, error.message);
  return ok({ company: data }, 201);
}
