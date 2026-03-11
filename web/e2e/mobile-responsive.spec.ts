import { expect, test, type Page } from "@playwright/test";
import { loginAsRole } from "./helpers";

async function openMobileNavLink(page: Page, linkName: string) {
  const menuButton = page.getByRole("button", { name: "Toggle navigation menu" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  const link = page.getByRole("link", { name: linkName, exact: true });
  await expect(link).toBeVisible();
  await link.click();
}

async function expectNoHorizontalOverflow(page: Page, pageLabel: string) {
  const overflow = await page.evaluate(() => {
    const maxWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return maxWidth - window.innerWidth;
  });

  expect(
    overflow,
    `${pageLabel} has horizontal overflow (${overflow}px) on mobile`,
  ).toBeLessThanOrEqual(4);
}

test.describe("Mobile responsive regression", () => {
  test("@smoke mobile core pages keep stable layout", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only suite");

    await loginAsRole(page, "admin");
    await expectNoHorizontalOverflow(page, "dashboard");

    const pages: Array<{ link: string; path: RegExp }> = [
      { link: "Colleagues", path: /\/colleagues$/ },
      { link: "Contacts", path: /\/contacts$/ },
      { link: "Companies", path: /\/companies$/ },
      { link: "Products", path: /\/products$/ },
      { link: "Categories", path: /\/categories$/ },
      { link: "Leads", path: /\/leads$/ },
      { link: "Tasks", path: /\/tasks$/ },
      { link: "Emails", path: /\/emails$/ },
      { link: "Access", path: /\/access$/ },
      { link: "My Profile", path: /\/profile$/ },
      { link: "Help", path: /\/help$/ },
      { link: "Settings", path: /\/settings$/ },
    ];

    for (const item of pages) {
      await openMobileNavLink(page, item.link);
      await expect(page).toHaveURL(item.path);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expectNoHorizontalOverflow(page, item.link);
    }
  });

  test("mobile email compose fields remain usable width", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only suite");

    await loginAsRole(page, "admin");
    await openMobileNavLink(page, "Emails");
    await expect(page).toHaveURL(/\/emails$/);

    const recipientInput = page.getByPlaceholder("Recipient name or email");
    const subjectInput = page.getByLabel("Subject");
    const bodyInput = page.getByLabel("Body");

    await expect(recipientInput).toBeVisible();
    await expect(subjectInput).toBeVisible();
    await expect(bodyInput).toBeVisible();

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const controls = [
      { label: "recipient", locator: recipientInput },
      { label: "subject", locator: subjectInput },
      { label: "body", locator: bodyInput },
    ];

    for (const control of controls) {
      const box = await control.locator.boundingBox();
      expect(box, `${control.label} field should have a measurable box`).not.toBeNull();
      expect(
        box!.width,
        `${control.label} field should span at least 75% of mobile viewport`,
      ).toBeGreaterThan(viewportWidth * 0.75);
    }

    await recipientInput.fill("test.mobile@example.com");
    await subjectInput.fill("Very long subject to validate mobile responsive rendering in email compose");
    await bodyInput.fill(
      "This is a long message body used to validate that textarea and page layout stay stable on mobile viewport.",
    );

    await expectNoHorizontalOverflow(page, "emails compose");
  });
});

