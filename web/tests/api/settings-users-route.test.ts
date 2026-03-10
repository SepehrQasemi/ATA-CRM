import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFluentQuery } from "./helpers";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getUserRole: vi.fn(),
  canManageUsers: vi.fn(),
  isAdminRole: vi.fn(),
  from: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  getUserRole: mocks.getUserRole,
  canManageUsers: mocks.canManageUsers,
  isAdminRole: mocks.isAdminRole,
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
    auth: {
      admin: {
        listUsers: mocks.listUsers,
      },
    },
  },
}));

import { GET, PATCH } from "@/app/api/settings/users/route";

describe("API /api/settings/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "actor-1", email: "actor@example.test" },
      response: null,
    });
  });

  it("blocks non-manager users from reading access settings", async () => {
    mocks.getUserRole.mockResolvedValue("standard_user");
    mocks.canManageUsers.mockReturnValue(false);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns users with auth emails for manager/admin", async () => {
    mocks.getUserRole.mockResolvedValue("manager");
    mocks.canManageUsers.mockReturnValue(true);
    const profilesQuery = createFluentQuery({
      data: [
        {
          id: "user-1",
          full_name: "User One",
          first_name: "User",
          last_name: "One",
          phone: null,
          position: "Sales Representative",
          department: "Sales",
          role: "standard_user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(profilesQuery);
    mocks.listUsers.mockResolvedValue({
      data: { users: [{ id: "user-1", email: "user1@example.test" }] },
      error: null,
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.actorRole).toBe("manager");
    expect(json.users[0].email).toBe("user1@example.test");
  });

  it("prevents manager from managing manager/admin accounts", async () => {
    mocks.getUserRole.mockResolvedValue("manager");
    mocks.canManageUsers.mockReturnValue(true);
    mocks.isAdminRole.mockReturnValue(false);
    const targetQuery = createFluentQuery({
      data: {
        id: "target-1",
        full_name: "Target Manager",
        first_name: "Target",
        last_name: "Manager",
        phone: null,
        position: "Manager",
        department: "Sales",
        role: "manager",
      },
      error: null,
    });
    mocks.from.mockReturnValue(targetQuery);

    const response = await PATCH(
      new Request("http://127.0.0.1:3000/api/settings/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "target-1",
          position: "Director",
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBe("Only admin can manage manager/admin accounts");
  });
});
