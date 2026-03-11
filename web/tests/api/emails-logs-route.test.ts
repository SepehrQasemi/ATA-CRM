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

import { GET } from "@/app/api/emails/logs/route";

describe("GET /api/emails/logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("limits non-admin analytics to sender_user_id", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");
    const query = createFluentQuery({ data: [{ id: "log-1" }], error: null });
    mocks.from.mockReturnValue(query);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("sender_user_id", "user-1");
    expect(json.logs).toHaveLength(1);
  });

  it("keeps full analytics scope for admins", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    const query = createFluentQuery({ data: [{ id: "log-1" }, { id: "log-2" }], error: null });
    mocks.from.mockReturnValue(query);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(query.eq).not.toHaveBeenCalledWith("sender_user_id", "user-1");
    expect(json.logs).toHaveLength(2);
  });
});
