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

import { GET } from "@/app/api/dashboard/route";

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("forces own scope for standard users", async () => {
    mocks.getUserRole.mockResolvedValue("standard_user");

    const nowIso = new Date().toISOString();
    const leadsQuery = createFluentQuery({
      data: [
        {
          id: "lead-1",
          status: "open",
          current_stage_id: "stg-new",
          estimated_value: 1000,
          target_close_date: null,
          last_activity_at: nowIso,
          owner_id: "user-1",
          assigned_to: null,
          source: "LinkedIn",
          created_at: nowIso,
          updated_at: nowIso,
        },
      ],
      error: null,
    });
    const tasksQuery = createFluentQuery({
      data: [],
      error: null,
    });
    const profilesQuery = createFluentQuery({
      data: [],
      error: null,
    });
    const stagesQuery = createFluentQuery({
      data: [{ id: "stg-new", name: "New Lead", sort_order: 1 }],
      error: null,
    });
    const historyQuery = createFluentQuery({
      data: [],
      error: null,
    });
    const emailsQuery = createFluentQuery({
      data: [],
      error: null,
    });

    mocks.from
      .mockReturnValueOnce(leadsQuery)
      .mockReturnValueOnce(tasksQuery)
      .mockReturnValueOnce(profilesQuery)
      .mockReturnValueOnce(stagesQuery)
      .mockReturnValueOnce(historyQuery)
      .mockReturnValueOnce(emailsQuery);

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/dashboard?range=30d&scope=team"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.scope).toBe("own");
    expect(json.availableScopes).toEqual(["own"]);
    expect(leadsQuery.or).toHaveBeenCalledWith("owner_id.eq.user-1,assigned_to.eq.user-1");
    expect(tasksQuery.or).toHaveBeenCalledWith("owner_id.eq.user-1,assigned_to.eq.user-1");
    expect(json.kpis.weightedPipelineValue).toBe(50);
  });

  it("allows manager to switch to team scope and returns weighted forecast", async () => {
    mocks.getUserRole.mockResolvedValue("manager");

    const now = new Date();
    const targetCloseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15))
      .toISOString()
      .slice(0, 10);
    const nowIso = now.toISOString();

    const leadsQuery = createFluentQuery({
      data: [
        {
          id: "lead-2",
          status: "open",
          current_stage_id: "stg-neg",
          estimated_value: 1000,
          target_close_date: targetCloseDate,
          last_activity_at: nowIso,
          owner_id: "user-2",
          assigned_to: "user-3",
          source: "Referral",
          created_at: nowIso,
          updated_at: nowIso,
        },
      ],
      error: null,
    });
    const tasksQuery = createFluentQuery({
      data: [],
      error: null,
    });
    const profilesQuery = createFluentQuery({
      data: [{ id: "user-3", full_name: "E2E Manager" }],
      error: null,
    });
    const stagesQuery = createFluentQuery({
      data: [
        { id: "stg-new", name: "New Lead", sort_order: 1 },
        { id: "stg-neg", name: "Negotiation", sort_order: 2 },
        { id: "stg-won", name: "Won", sort_order: 3 },
        { id: "stg-lost", name: "Lost", sort_order: 4 },
      ],
      error: null,
    });
    const historyQuery = createFluentQuery({
      data: [],
      error: null,
    });
    const emailsQuery = createFluentQuery({
      data: [],
      error: null,
    });

    mocks.from
      .mockReturnValueOnce(leadsQuery)
      .mockReturnValueOnce(tasksQuery)
      .mockReturnValueOnce(profilesQuery)
      .mockReturnValueOnce(stagesQuery)
      .mockReturnValueOnce(historyQuery)
      .mockReturnValueOnce(emailsQuery);

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/dashboard?range=30d&scope=team"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.scope).toBe("team");
    expect(json.availableScopes).toEqual(["own", "team"]);
    expect(leadsQuery.or).not.toHaveBeenCalled();
    expect(tasksQuery.or).not.toHaveBeenCalled();
    expect(json.kpis.weightedPipelineValue).toBe(700);
    expect(json.forecastCalendar.length).toBeGreaterThan(0);
    expect(json.forecastCalendar[0].weightedValue).toBe(700);
  });
});
