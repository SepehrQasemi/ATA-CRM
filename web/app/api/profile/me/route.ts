import { canManageUsers, getUserRole, requireAuthenticatedUser } from "@/lib/auth";
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

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth.response || !auth.user) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id,full_name,first_name,last_name,phone,position,department,role,created_at,updated_at",
    )
    .eq("id", auth.user.id)
    .single<ProfileRow>();

  if (error) return fail("Failed to load profile", 500, error.message);

  return ok({
    profile: {
      ...data,
      email: auth.user.email,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response || !auth.user) return auth.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Invalid payload", 400);

  const role = await getUserRole(auth.user.id);
  const managerAccess = canManageUsers(role);

  const { data: currentProfile, error: currentError } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,first_name,last_name,phone,position,department,role")
    .eq("id", auth.user.id)
    .single<ProfileRow>();

  if (currentError || !currentProfile) return fail("Profile not found", 404);

  const firstName = asOptionalText(body.first_name);
  const lastName = asOptionalText(body.last_name);
  const phone = asOptionalText(body.phone);
  const department = asOptionalText(body.department);
  const position = asOptionalText(body.position);
  const email = asOptionalText(body.email);

  const updates: Record<string, string | null> = {};

  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;
  if (phone !== undefined) updates.phone = phone;

  if (department !== undefined) {
    if (!managerAccess) return fail("Only manager/admin can update department", 403);
    updates.department = department;
  }

  if (position !== undefined) {
    if (!managerAccess) return fail("Only manager/admin can update position", 403);
    updates.position = position;
  }

  const nextFirstName = updates.first_name !== undefined ? updates.first_name : currentProfile.first_name;
  const nextLastName = updates.last_name !== undefined ? updates.last_name : currentProfile.last_name;

  if (updates.first_name !== undefined || updates.last_name !== undefined) {
    updates.full_name = composeFullName(nextFirstName, nextLastName, currentProfile.full_name);
  }

  let changedEmail = auth.user.email;
  if (email !== undefined && email && email !== auth.user.email) {
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
      email,
    });

    if (emailError) {
      return fail("Failed to update email", 400, emailError.message);
    }

    changedEmail = email;
  }

  let updatedProfile = currentProfile;
  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", auth.user.id)
      .select(
        "id,full_name,first_name,last_name,phone,position,department,role,created_at,updated_at",
      )
      .single<ProfileRow>();

    if (error || !data) return fail("Failed to update profile", 500, error?.message);
    updatedProfile = data;
  }

  return ok({
    profile: {
      ...updatedProfile,
      email: changedEmail,
    },
  });
}
