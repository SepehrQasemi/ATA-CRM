import { expect, test } from "@playwright/test";
import { loginAsRole } from "./helpers";

test.describe("Mobile responsive smoke", () => {
  test("@smoke mobile login and navigation shell works", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only suite");

    await loginAsRole(page, "admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    const menuButton = page.getByRole("button", { name: "Toggle navigation menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    await page.getByRole("link", { name: "Leads" }).click();
    await expect(page).toHaveURL(/\/leads$/);
    await expect(page.getByRole("heading", { name: "Leads & Pipeline" })).toBeVisible();
  });
});
