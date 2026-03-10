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

type ColleagueRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position: string | null;
  phone: string | null;
  department: string | null;
  role: string | null;
};

async function listAuthEmails() {
  const emails = new Map<string, string | null>();
  const perPage = 200;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return { emails, error: error.message };

    const users = data?.users ?? [];
    for (const user of users) {
      emails.set(user.id, user.email ?? null);
    }

    if (users.length < perPage) break;
  }

  return { emails, error: null as string | null };
}

function canSeePrivateProfile(actorRole: string): boolean {
  return actorRole === "admin" || actorRole === "manager";
}

function toColleague(
  profile: ProfileRow,
  emails: Map<string, string | null>,
  includePrivate: boolean,
): ColleagueRow {
  return {
    id: profile.id,
    full_name: profile.full_name,
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: emails.get(profile.id) ?? null,
    position: profile.position,
    phone: includePrivate ? profile.phone : null,
    department: includePrivate ? profile.department : null,
    role: includePrivate ? profile.role : null,
  };
}

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth.response || !auth.user) return auth.response;

  const actorRole = await getUserRole(auth.user.id);
  const includePrivate = canSeePrivateProfile(actorRole);

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,first_name,last_name,phone,position,department,role")
    .order("full_name", { ascending: true });

  if (profilesError) return fail("Failed to load colleagues", 500, profilesError.message);

  const { emails, error: usersError } = await listAuthEmails();
  if (usersError) return fail("Failed to load colleague emails", 500, usersError);

  return ok({
    actorRole,
    colleagues: (profiles ?? []).map((profile) =>
      toColleague(profile as ProfileRow, emails, includePrivate),
    ),
  });
}
