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

import { DELETE, PATCH } from "@/app/api/tasks/[id]/route";

describe("PATCH/DELETE /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("returns forbidden when user has no access to task", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const accessQuery = createFluentQuery({
      data: null,
      error: { message: "not found" },
    });
    mocks.from.mockReturnValueOnce(accessQuery);

    const response = await PATCH(new Request("http://127.0.0.1:3000/api/tasks/task-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
      headers: { "Content-Type": "application/json" },
    }), { params: Promise.resolve({ id: "task-1" }) });

    expect(response.status).toBe(403);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it("allows admin to patch and delete any task", async () => {
    mocks.getUserRole.mockResolvedValue("admin");

    const accessQueryForPatch = createFluentQuery({
      data: { id: "task-1", owner_id: "someone", assigned_to: "another" },
      error: null,
    });
    const updateQuery = createFluentQuery({
      data: { id: "task-1", title: "Updated task", status: "done" },
      error: null,
    });

    mocks.from
      .mockReturnValueOnce(accessQueryForPatch)
      .mockReturnValueOnce(updateQuery);

    const patchResponse = await PATCH(
      new Request("http://127.0.0.1:3000/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated task", status: "done" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "task-1" }) },
    );

    expect(patchResponse.status).toBe(200);
    expect(updateQuery.update).toHaveBeenCalled();

    const accessQueryForDelete = createFluentQuery({
      data: { id: "task-1", owner_id: "someone", assigned_to: "another" },
      error: null,
    });
    const deleteQuery = createFluentQuery({
      data: null,
      error: null,
    });

    mocks.from
      .mockReturnValueOnce(accessQueryForDelete)
      .mockReturnValueOnce(deleteQuery);

    const deleteResponse = await DELETE(
      new Request("http://127.0.0.1:3000/api/tasks/task-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "task-1" }) },
    );

    expect(deleteResponse.status).toBe(200);
    expect(deleteQuery.delete).toHaveBeenCalled();
  });

  it("allows task owner to patch nullable fields and mark done", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const accessQuery = createFluentQuery({
      data: { id: "task-1", owner_id: "user-1", assigned_to: null },
      error: null,
    });
    const updateQuery = createFluentQuery({
      data: { id: "task-1", status: "done" },
      error: null,
    });
    mocks.from.mockReturnValueOnce(accessQuery).mockReturnValueOnce(updateQuery);

    const response = await PATCH(
      new Request("http://127.0.0.1:3000/api/tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "done",
          due_date: null,
          assigned_to: null,
          lead_id: null,
          company_id: null,
          contact_id: null,
          description: null,
        }),
      }),
      { params: Promise.resolve({ id: "task-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "done",
        due_date: null,
        assigned_to: null,
        lead_id: null,
        company_id: null,
        contact_id: null,
        description: null,
        completed_at: expect.any(String),
      }),
    );
  });

  it("blocks delete for non-owner non-assignee non-admin", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const accessQuery = createFluentQuery({
      data: { id: "task-1", owner_id: "another-user", assigned_to: "third-user" },
      error: null,
    });
    mocks.from.mockReturnValueOnce(accessQuery);

    const response = await DELETE(
      new Request("http://127.0.0.1:3000/api/tasks/task-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "task-1" }) },
    );

    expect(response.status).toBe(403);
  });
});
