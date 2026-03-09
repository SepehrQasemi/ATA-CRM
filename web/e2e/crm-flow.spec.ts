import { expect, test } from "@playwright/test";
import {
  loginAsE2EAdmin,
  pickSelectOptionByText,
  sectionByHeading,
  toDateTimeLocalInputValue,
  uniqueLabel,
} from "./helpers";

test.describe("CRM end-to-end", () => {
  test("covers dashboard, companies, products, leads, tasks, and emails", async ({ page }) => {
    const companyName = uniqueLabel("Company");
    const productName = uniqueLabel("Product");
    const leadTitle = uniqueLabel("Lead");
    const taskTitle = uniqueLabel("Task");
    const sku = `SKU-${Date.now()}`;

    await loginAsE2EAdmin(page);

    await page.getByRole("button", { name: "7 days" }).click();
    await expect(page.getByText("Pipeline by stage (count + value)")).toBeVisible();
    await page.getByRole("button", { name: "30 days" }).click();
    await expect(page.getByText("Sales leaderboard (won leads value)")).toBeVisible();

    await page.getByRole("link", { name: "Companies" }).click();
    await expect(page).toHaveURL(/\/companies$/);
    const companyForm = sectionByHeading(page, "New company");
    await companyForm.getByLabel("Name").fill(companyName);
    await companyForm.getByLabel("Company role").selectOption("both");
    await companyForm.getByLabel("Sector").fill("Food Ingredients");
    await companyForm.getByLabel("City").fill("Paris");
    await companyForm.getByLabel("Country").fill("France");
    await companyForm.getByRole("button", { name: "Create company" }).click();

    const companyList = sectionByHeading(page, "Company list");
    const companyRow = companyList.locator("tbody tr", { hasText: companyName }).first();
    await expect(companyRow).toBeVisible();
    await expect(companyRow).toContainText("Supplier + Customer");

    await page.getByRole("link", { name: "Products" }).click();
    await expect(page).toHaveURL(/\/products$/);
    const productForm = sectionByHeading(page, "New product");
    await productForm.getByLabel("Name").fill(productName);
    await productForm.getByLabel("SKU").fill(sku);
    await productForm.getByLabel("Category").fill("Cocoa");
    await productForm.getByLabel("Purchase price").fill("1200");
    await productForm.getByLabel("Sale price").fill("1450");
    await productForm.getByRole("button", { name: "Create product" }).click();

    const relationSection = sectionByHeading(page, "Product-company relations");
    const relationProductSelect = relationSection.getByLabel("Product");
    const relationCompanySelect = relationSection.getByLabel("Company");
    const relationCategorySelect = relationSection.getByLabel("Category");
    const saveRelationButton = relationSection.getByRole("button", { name: "Save relation" });

    await pickSelectOptionByText(relationProductSelect, productName);
    await pickSelectOptionByText(relationCompanySelect, companyName);
    await relationCategorySelect.selectOption("traded");
    await saveRelationButton.click();
    await expect(page.getByText("Product relation saved")).toBeVisible();

    await pickSelectOptionByText(relationProductSelect, productName);
    await pickSelectOptionByText(relationCompanySelect, companyName);
    await relationCategorySelect.selectOption("potential");
    await saveRelationButton.click();
    await expect(page.getByText("Product relation saved")).toBeVisible();

    const productList = sectionByHeading(page, "Product list");
    const productRow = productList.locator("tbody tr", { hasText: productName }).first();
    await expect(productRow).toBeVisible();
    await expect(productRow.locator(".tag-traded", { hasText: companyName })).toBeVisible();
    await expect(productRow.locator(".tag-potential", { hasText: companyName })).toBeVisible();

    await page.getByRole("link", { name: "Companies" }).click();
    const companyRowAfterLinks = sectionByHeading(page, "Company list")
      .locator("tbody tr", { hasText: companyName })
      .first();
    await expect(companyRowAfterLinks.locator(".tag-traded", { hasText: productName })).toBeVisible();
    await expect(
      companyRowAfterLinks.locator(".tag-potential", { hasText: productName }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Leads" }).click();
    await expect(page).toHaveURL(/\/leads$/);
    const leadForm = sectionByHeading(page, "New lead");
    await leadForm.getByLabel("Title").fill(leadTitle);
    await leadForm.getByLabel("Source").fill("E2E");
    await leadForm.getByLabel("Estimated value").fill("5200");
    await pickSelectOptionByText(leadForm.getByLabel("Company"), companyName);
    await leadForm.getByRole("button", { name: "Create lead" }).click();

    const leadList = sectionByHeading(page, "Lead list");
    const leadRow = leadList.locator("tbody tr", { hasText: leadTitle }).first();
    await expect(leadRow).toBeVisible();
    const leadStageCell = () =>
      leadList.locator("tbody tr", { hasText: leadTitle }).first().locator("td").nth(1);
    const stageBeforeMove = (await leadStageCell().innerText()).trim();

    const leadCard = sectionByHeading(page, "Pipeline board")
      .locator(".lead-card", { hasText: leadTitle })
      .first();
    await expect(leadCard).toBeVisible();
    await leadCard.getByRole("button", { name: "Next" }).click();

    await expect
      .poll(async () => (await leadStageCell().innerText()).trim(), {
        message: "Lead stage should change after quick move",
      })
      .not.toBe(stageBeforeMove);

    await page.getByRole("link", { name: "Tasks" }).click();
    await expect(page).toHaveURL(/\/tasks$/);
    const taskForm = sectionByHeading(page, "New task");
    await taskForm.getByLabel("Title").fill(taskTitle);
    await taskForm
      .getByLabel("Due date")
      .fill(toDateTimeLocalInputValue(new Date(Date.now() + 48 * 60 * 60 * 1000)));
    await taskForm.getByLabel("Priority").selectOption("high");
    await taskForm.getByLabel("Status").selectOption("todo");
    await pickSelectOptionByText(taskForm.getByLabel("Company"), companyName);
    await taskForm.getByLabel("Description").fill("E2E follow-up task");
    await taskForm.getByRole("button", { name: "Create task" }).click();

    const taskList = sectionByHeading(page, "Task list");
    const taskRow = taskList.locator("tbody tr", { hasText: taskTitle }).first();
    await expect(taskRow).toBeVisible();
    const taskStatusSelect = taskRow.locator("select").first();
    await taskStatusSelect.selectOption("done");
    await expect(taskStatusSelect).toHaveValue("done");

    await page.getByRole("link", { name: "Emails" }).click();
    await expect(page).toHaveURL(/\/emails$/);
    await page.getByRole("button", { name: "Dry run" }).click();
    await expect(page.getByText(/Dry-run done:/)).toBeVisible();
    await expect(sectionByHeading(page, "Email logs")).toBeVisible();
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("mobile navigation opens and routes correctly", async ({ page }) => {
      await loginAsE2EAdmin(page);
      await expect(page.getByRole("button", { name: "Toggle navigation menu" })).toBeVisible();

      await page.getByRole("button", { name: "Toggle navigation menu" }).click();
      await page.getByRole("link", { name: "Products" }).click();
      await expect(page).toHaveURL(/\/products$/);
      await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

      await page.getByRole("button", { name: "Toggle navigation menu" }).click();
      await page.getByRole("link", { name: "Dashboard" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    });
  });
});
