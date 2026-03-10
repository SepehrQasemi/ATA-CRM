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

import { GET } from "@/app/api/tasks/route";

describe("GET /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("applies ownership filter for non-admin users and returns tasks", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const query = createFluentQuery({
      data: [{ id: "task-1", title: "Follow up" }],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/tasks?status=todo&q=Follow"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.tasks).toHaveLength(1);
    expect(query.or).toHaveBeenCalledWith("owner_id.eq.user-1,assigned_to.eq.user-1");
    expect(query.eq).toHaveBeenCalledWith("status", "todo");
    expect(query.ilike).toHaveBeenCalledWith("title", "%Follow%");
  });

  it("returns 500 when the database query fails", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    const query = createFluentQuery({
      data: null,
      error: { message: "db failure" },
    });
    mocks.from.mockReturnValue(query);

    const response = await GET(new Request("http://127.0.0.1:3000/api/tasks"));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Failed to load tasks");
  });

  it("applies overdue and date range filters", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    const query = createFluentQuery({
      data: [],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    await GET(
      new Request(
        "http://127.0.0.1:3000/api/tasks?overdue=true&from=2026-03-01&to=2026-03-10",
      ),
    );

    expect(query.gte).toHaveBeenCalled();
    expect(query.lte).toHaveBeenCalled();
    expect(query.not).toHaveBeenCalledWith("due_date", "is", "null");
    expect(query.lt).toHaveBeenCalled();
    expect(query.neq).toHaveBeenCalledWith("status", "done");
  });
});

describe("POST /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("validates required title", async () => {
    const response = await (
      await import("@/app/api/tasks/route")
    ).POST(
      new Request("http://127.0.0.1:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("creates task with owner defaults", async () => {
    const insertQuery = createFluentQuery({
      data: {
        id: "task-new",
        title: "Call customer",
        status: "todo",
      },
      error: null,
    });
    mocks.from.mockReturnValue(insertQuery);

    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Call customer",
          priority: "high",
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Call customer",
        owner_id: "user-1",
        assigned_to: "user-1",
      }),
    );
    expect(json.task.id).toBe("task-new");
  });

  it("returns 500 when task insert fails", async () => {
    const insertQuery = createFluentQuery({
      data: null,
      error: { message: "insert failed" },
    });
    mocks.from.mockReturnValue(insertQuery);

    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Will fail",
        }),
      }),
    );

    expect(response.status).toBe(500);
  });
});
