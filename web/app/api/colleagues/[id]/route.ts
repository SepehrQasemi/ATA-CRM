import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: string;
};

function canSeePrivateProfile(actorRole: string): boolean {
  return actorRole === "admin" || actorRole === "manager";
}

async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response || !auth.user) return auth.response;

  const { id } = await context.params;
  if (!id) return fail("id is required", 400);

  const actorRole = await getUserRole(auth.user.id);
  const includePrivate = canSeePrivateProfile(actorRole);

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,first_name,last_name,phone,position,department,role")
    .eq("id", id)
    .single<ProfileRow>();

  if (error || !profile) return fail("Colleague not found", 404);

  const email = await getUserEmail(profile.id);

  return ok({
    actorRole,
    colleague: {
      id: profile.id,
      full_name: profile.full_name,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email,
      position: profile.position,
      phone: includePrivate ? profile.phone : null,
      department: includePrivate ? profile.department : null,
      role: includePrivate ? profile.role : null,
    },
  });
}
