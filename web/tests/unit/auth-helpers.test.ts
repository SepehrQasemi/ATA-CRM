import { describe, expect, it } from "vitest";
import { canManageUsers, isAdminRole } from "@/lib/auth";

describe("auth helper role guards", () => {
  it("detects admin role", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("manager")).toBe(false);
    expect(isAdminRole("commercial")).toBe(false);
  });

  it("allows only admin and manager to manage users", () => {
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("manager")).toBe(true);
    expect(canManageUsers("commercial")).toBe(false);
    expect(canManageUsers("standard_user")).toBe(false);
  });
});
