import {
  canManageUsers,
  getUserRole,
  isAdminRole,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_ROLES = new Set(["admin", "manager", "commercial", "standard_user"]);

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

function asOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function composeFullName(firstName: string | null, lastName: string | null, fallback: string | null) {
  const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
  return combined || fallback;
}

async function listAllUserEmails() {
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

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth.response || !auth.user) return auth.response;

  const actorRole = await getUserRole(auth.user.id);
  if (!canManageUsers(actorRole)) {
    return fail("Forbidden", 403);
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id,full_name,first_name,last_name,phone,position,department,role,created_at,updated_at",
    )
    .order("full_name", { ascending: true });

  if (profilesError) return fail("Failed to load users", 500, profilesError.message);

  const { emails, error: usersError } = await listAllUserEmails();
  if (usersError) return fail("Failed to load auth users", 500, usersError);

  return ok({
    actorRole,
    users: (profiles ?? []).map((profile) => ({
      ...profile,
      email: emails.get(profile.id) ?? null,
      is_self: profile.id === auth.user.id,
    })),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response || !auth.user) return auth.response;

  const actorRole = await getUserRole(auth.user.id);
  if (!canManageUsers(actorRole)) {
    return fail("Forbidden", 403);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Invalid payload", 400);

  const userId = typeof body.user_id === "string" ? body.user_id : null;
  if (!userId) return fail("user_id is required", 400);

  const { data: target, error: targetError } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,first_name,last_name,phone,position,department,role")
    .eq("id", userId)
    .single<ProfileRow>();

  if (targetError || !target) return fail("User not found", 404);

  const actorIsAdmin = isAdminRole(actorRole);
  const targetIsManagerOrAdmin = target.role === "admin" || target.role === "manager";

  if (!actorIsAdmin && targetIsManagerOrAdmin) {
    return fail("Only admin can manage manager/admin accounts", 403);
  }

  const firstName = asOptionalText(body.first_name);
  const lastName = asOptionalText(body.last_name);
  const phone = asOptionalText(body.phone);
  const position = asOptionalText(body.position);
  const department = asOptionalText(body.department);
  const role = asOptionalText(body.role);

  const updates: Record<string, string | null> = {};

  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;
  if (phone !== undefined) updates.phone = phone;
  if (position !== undefined) updates.position = position;
  if (department !== undefined) updates.department = department;

  if (role !== undefined) {
    if (!actorIsAdmin) {
      return fail("Only admin can change roles", 403);
    }

    if (!role || !ALLOWED_ROLES.has(role)) {
      return fail("Invalid role", 400);
    }

    updates.role = role;
  }

  const nextFirstName = updates.first_name !== undefined ? updates.first_name : target.first_name;
  const nextLastName = updates.last_name !== undefined ? updates.last_name : target.last_name;

  if (updates.first_name !== undefined || updates.last_name !== undefined) {
    updates.full_name = composeFullName(nextFirstName, nextLastName, target.full_name);
  }

  if (Object.keys(updates).length === 0) {
    return fail("No valid fields to update", 400);
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select(
      "id,full_name,first_name,last_name,phone,position,department,role,created_at,updated_at",
    )
    .single<ProfileRow>();

  if (updateError || !updated) return fail("Failed to update user", 500, updateError?.message);

  return ok({ user: updated });
}
