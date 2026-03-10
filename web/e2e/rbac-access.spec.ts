import { expect, test } from "@playwright/test";
import { loginAsRole } from "./helpers";

test.describe("Access RBAC", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop-only suite");

  test("@smoke admin can access colleagues page", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.getByRole("link", { name: "Colleagues" }).click();
    await expect(page).toHaveURL(/\/colleagues$/);
    await expect(page.getByRole("heading", { name: "Colleagues" })).toBeVisible();
  });

  test("@smoke admin can access user management", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.getByRole("link", { name: "Access" }).click();
    await expect(page).toHaveURL(/\/access$/);
    await expect(page.getByRole("heading", { name: "Access" })).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeEnabled();
  });

  test("manager can open access page but cannot change roles", async ({ page }) => {
    await loginAsRole(page, "manager");
    await page.getByRole("link", { name: "Access" }).click();
    await expect(page).toHaveURL(/\/access$/);
    await expect(page.getByRole("heading", { name: "Access" })).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeDisabled();
  });

  test("commercial user cannot see access page entry", async ({ page }) => {
    await loginAsRole(page, "commercial");
    await expect(page.getByRole("link", { name: "Access" })).toHaveCount(0);
  });

  test("standard user cannot see access page entry", async ({ page }) => {
    await loginAsRole(page, "standard_user");
    await expect(page.getByRole("link", { name: "Access" })).toHaveCount(0);
  });
});
