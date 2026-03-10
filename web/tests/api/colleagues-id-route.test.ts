import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFluentQuery } from "./helpers";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getUserRole: vi.fn(),
  from: vi.fn(),
  getUserById: vi.fn(),
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
        getUserById: mocks.getUserById,
      },
    },
  },
}));

import { GET } from "@/app/api/colleagues/[id]/route";

describe("API /api/colleagues/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "actor-1", email: "actor@example.test" },
      response: null,
    });
    mocks.getUserById.mockResolvedValue({
      data: { user: { id: "user-1", email: "user1@example.test" } },
      error: null,
    });
    mocks.from.mockReturnValue(
      createFluentQuery({
        data: {
          id: "user-1",
          full_name: "User One",
          first_name: "User",
          last_name: "One",
          phone: "+33123456789",
          position: "Sales",
          department: "Commercial",
          role: "manager",
        },
        error: null,
      }),
    );
  });

  it("hides private fields for standard/commercial users", async () => {
    mocks.getUserRole.mockResolvedValue("standard_user");

    const response = await GET(new Request("http://127.0.0.1:3000/api/colleagues/user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.colleague.email).toBe("user1@example.test");
    expect(json.colleague.phone).toBeNull();
    expect(json.colleague.department).toBeNull();
    expect(json.colleague.role).toBeNull();
  });

  it("returns private fields for manager/admin", async () => {
    mocks.getUserRole.mockResolvedValue("admin");

    const response = await GET(new Request("http://127.0.0.1:3000/api/colleagues/user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.colleague.phone).toBe("+33123456789");
    expect(json.colleague.department).toBe("Commercial");
    expect(json.colleague.role).toBe("manager");
  });
});
