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

import { DELETE, PATCH } from "@/app/api/leads/[id]/route";

describe("PATCH /api/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("returns 403 when user does not own lead and is not admin", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const accessQuery = createFluentQuery({
      data: { id: "lead-1", owner_id: "user-x", assigned_to: "user-y" },
      error: null,
    });
    mocks.from.mockReturnValue(accessQuery);

    const response = await PATCH(
      new Request("http://127.0.0.1:3000/api/leads/lead-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Blocked update" }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("allows admin to update lead", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    const accessQuery = createFluentQuery({
      data: { id: "lead-1", owner_id: "user-x", assigned_to: "user-y" },
      error: null,
    });
    const updateQuery = createFluentQuery({
      data: { id: "lead-1", title: "Admin Updated Lead" },
      error: null,
    });
    mocks.from.mockReturnValueOnce(accessQuery).mockReturnValueOnce(updateQuery);

    const response = await PATCH(
      new Request("http://127.0.0.1:3000/api/leads/lead-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Admin Updated Lead" }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.lead.title).toBe("Admin Updated Lead");
  });

  it("allows lead owner to update nullable fields", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const accessQuery = createFluentQuery({
      data: { id: "lead-1", owner_id: "user-1", assigned_to: null },
      error: null,
    });
    const updateQuery = createFluentQuery({
      data: { id: "lead-1", title: "Owned Lead", company_id: null },
      error: null,
    });
    mocks.from.mockReturnValueOnce(accessQuery).mockReturnValueOnce(updateQuery);

    const response = await PATCH(
      new Request("http://127.0.0.1:3000/api/leads/lead-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Owned Lead",
          company_id: null,
          contact_id: null,
          notes: null,
        }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Owned Lead",
        company_id: null,
        contact_id: null,
        notes: null,
      }),
    );
  });

  it("ignores assigned_to changes for non-admin users", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const accessQuery = createFluentQuery({
      data: { id: "lead-1", owner_id: "user-1", assigned_to: "user-1" },
      error: null,
    });
    const updateQuery = createFluentQuery({
      data: { id: "lead-1", title: "Owned Lead", assigned_to: "user-1" },
      error: null,
    });
    mocks.from.mockReturnValueOnce(accessQuery).mockReturnValueOnce(updateQuery);

    const response = await PATCH(
      new Request("http://127.0.0.1:3000/api/leads/lead-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Owned Lead",
          assigned_to: "user-99",
        }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(200);
    const payload = (updateQuery.update as { mock: { calls: Array<[Record<string, unknown>]> } })
      .mock.calls[0][0] as {
      assigned_to?: string;
    };
    expect(payload.assigned_to).toBeUndefined();
  });

  it("supports admin delete path", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    const accessQuery = createFluentQuery({
      data: { id: "lead-1", owner_id: "user-x", assigned_to: "user-y" },
      error: null,
    });
    const deleteQuery = createFluentQuery({
      data: null,
      error: null,
    });
    mocks.from.mockReturnValueOnce(accessQuery).mockReturnValueOnce(deleteQuery);

    const response = await DELETE(
      new Request("http://127.0.0.1:3000/api/leads/lead-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(200);
    expect(deleteQuery.delete).toHaveBeenCalled();
  });

  it("returns 500 on update database failure", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    const accessQuery = createFluentQuery({
      data: { id: "lead-1", owner_id: "user-x", assigned_to: "user-y" },
      error: null,
    });
    const updateQuery = createFluentQuery({
      data: null,
      error: { message: "db failure" },
    });
    mocks.from.mockReturnValueOnce(accessQuery).mockReturnValueOnce(updateQuery);

    const response = await PATCH(
      new Request("http://127.0.0.1:3000/api/leads/lead-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "broken update" }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(500);
  });

  it("blocks delete when user has no access", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const accessQuery = createFluentQuery({
      data: { id: "lead-1", owner_id: "other-user", assigned_to: "another-user" },
      error: null,
    });
    mocks.from.mockReturnValueOnce(accessQuery);

    const response = await DELETE(
      new Request("http://127.0.0.1:3000/api/leads/lead-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(403);
  });
});
