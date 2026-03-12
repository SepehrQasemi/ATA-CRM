import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFluentQuery } from "./helpers";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getUserRole: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  getUserRole: mocks.getUserRole,
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST } from "@/app/api/leads/route";

describe("POST /api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "owner@example.test" },
      response: null,
    });
  });

  it("forces assigned_to to creator for non-admin users", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const insertQuery = createFluentQuery({
      data: { id: "lead-1", assigned_to: "user-1", owner_id: "user-1", status: "open" },
      error: null,
    });
    mocks.from.mockReturnValue(insertQuery);

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Scoped lead",
          source: "LinkedIn",
          assigned_to: "user-2",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Scoped lead",
        status: "open",
        owner_id: "user-1",
        assigned_to: "user-1",
      }),
    );
  });

  it("allows admin to assign lead to another teammate", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    const insertQuery = createFluentQuery({
      data: { id: "lead-2", assigned_to: "user-2", owner_id: "user-1", status: "open" },
      error: null,
    });
    mocks.from.mockReturnValue(insertQuery);

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Admin assigned lead",
          source: "Trade show",
          assigned_to: "user-2",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Admin assigned lead",
        assigned_to: "user-2",
      }),
    );
  });

  it("rejects unsupported lead source values", async () => {
    mocks.getUserRole.mockResolvedValue("admin");

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Invalid source lead",
          source: "Telegram",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
