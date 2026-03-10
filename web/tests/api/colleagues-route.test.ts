import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFluentQuery } from "./helpers";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getUserRole: vi.fn(),
  from: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  getUserRole: mocks.getUserRole,
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

import { GET } from "@/app/api/colleagues/route";

describe("API /api/colleagues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "actor-1", email: "actor@example.test" },
      response: null,
    });
    mocks.listUsers.mockResolvedValue({
      data: { users: [{ id: "user-1", email: "user1@example.test" }] },
      error: null,
    });
  });

  it("returns public-only fields for standard/commercial users", async () => {
    mocks.getUserRole.mockResolvedValue("standard_user");
    mocks.from.mockReturnValue(
      createFluentQuery({
        data: [
          {
            id: "user-1",
            full_name: "User One",
            first_name: "User",
            last_name: "One",
            phone: "+33123456789",
            position: "Sales",
            department: "Commercial",
            role: "manager",
          },
        ],
        error: null,
      }),
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.colleagues[0].email).toBe("user1@example.test");
    expect(json.colleagues[0].phone).toBeNull();
    expect(json.colleagues[0].department).toBeNull();
    expect(json.colleagues[0].role).toBeNull();
  });

  it("returns full profile fields for manager/admin", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    mocks.from.mockReturnValue(
      createFluentQuery({
        data: [
          {
            id: "user-1",
            full_name: "User One",
            first_name: "User",
            last_name: "One",
            phone: "+33123456789",
            position: "Sales",
            department: "Commercial",
            role: "manager",
          },
        ],
        error: null,
      }),
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.colleagues[0].phone).toBe("+33123456789");
    expect(json.colleagues[0].department).toBe("Commercial");
    expect(json.colleagues[0].role).toBe("manager");
  });
});
