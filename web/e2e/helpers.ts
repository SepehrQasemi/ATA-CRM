import { expect, type Locator, type Page } from "@playwright/test";

export const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL ?? "e2e.admin@crm-food-trading.local";
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "E2E-StrongPass!123";

export function uniqueLabel(prefix: string): string {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `[E2E] ${prefix} ${now}-${rand}`;
}

export function sectionByHeading(page: Page, heading: string): Locator {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

export function toDateTimeLocalInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export async function loginAsE2EAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "CRM Food Trading" })).toBeVisible();

  await page.getByLabel("Email").fill(E2E_USER_EMAIL);
  await page.getByLabel("Password").fill(E2E_USER_PASSWORD);
  await page.locator("form").getByRole("button", { name: /^Login$/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function pickSelectOptionByText(
  select: Locator,
  optionText: string,
): Promise<void> {
  const optionValue = await select
    .locator("option")
    .filter({ hasText: optionText })
    .first()
    .getAttribute("value");

  if (!optionValue) {
    throw new Error(`Could not find select option: ${optionText}`);
  }

  await select.selectOption(optionValue);
}
