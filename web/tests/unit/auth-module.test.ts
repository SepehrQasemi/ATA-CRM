import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import {
  canManageUsers,
  getAuthenticatedUser,
  getUserRole,
  isAdminRole,
  requireAuthenticatedUser,
} from "@/lib/auth";

describe("auth module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns authenticated user payload", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: { id: "u-1", email: "u1@example.test" },
      },
    });

    await expect(getAuthenticatedUser()).resolves.toEqual({
      id: "u-1",
      email: "u1@example.test",
    });
  });

  it("returns null when there is no current user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });

  it("returns unauthorized response from requireAuthenticatedUser", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const result = await requireAuthenticatedUser();
    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it("returns the persisted role from profiles", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      single: vi.fn(async () => ({ data: { role: "manager" } })),
    };
    mocks.from.mockReturnValue(query);

    await expect(getUserRole("u-1")).resolves.toBe("manager");
  });

  it("falls back to standard_user role when profile is missing", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      single: vi.fn(async () => ({ data: null })),
    };
    mocks.from.mockReturnValue(query);

    await expect(getUserRole("u-1")).resolves.toBe("standard_user");
  });

  it("evaluates role guards", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("manager")).toBe(false);
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("manager")).toBe(true);
    expect(canManageUsers("commercial")).toBe(false);
  });
});
