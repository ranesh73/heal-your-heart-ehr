import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const credentialsPath = resolve("../.demo-credentials.txt");
const password = readFileSync(credentialsPath, "utf8")
  .match(/Password for all demo accounts: (.+)/)![1]
  .trim();

const artifactDir = resolve("test-results/import_results_correction");
mkdirSync(artifactDir, { recursive: true });

async function login(page: any, role = "doctor") {
  await page.goto("http://127.0.0.1:8000/#/login");
  await page.getByLabel("Staff email").fill(role + "@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.waitForTimeout(1000);
}

test.describe("Lab Orders: Distinct Import Results vs Edit Lab Order Actions", () => {
  test("Separation of Import Results and Edit Lab Order workflows", async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as Doctor
    await login(page, "doctor");

    // 2. Navigate to Labs module
    await page.goto("http://127.0.0.1:8000/#/labs");
    await page.waitForTimeout(1000);

    // 3. Switch to Lab Orders tab
    const labOrdersTab = page.locator('button, [role="tab"]').filter({ hasText: /Lab Orders/i }).first();
    await expect(labOrdersTab).toBeVisible();
    await labOrdersTab.click();
    await page.waitForTimeout(800);

    // Switch Order Status filter to "All" to ensure all orders are visible
    const statusDropdown = page.locator("select").filter({ has: page.locator('option[value="pending_partial"]') }).first();
    if (await statusDropdown.isVisible()) {
      await statusDropdown.selectOption("all");
      await page.waitForTimeout(600);
    }

    // Verify Lab Orders table rendered
    const orderRows = page.locator("tbody tr");
    await expect(orderRows.first()).toBeVisible();

    // 4. Click Three-Dot Menu on first order row
    const firstRow = orderRows.first();
    const threeDotBtn = firstRow.locator("button.charm-action-btn").or(firstRow.getByRole("button", { name: /Order Actions/i })).first();
    await expect(threeDotBtn).toBeVisible();
    await threeDotBtn.click();
    await page.waitForTimeout(400);

    // Verify all 9 menu items exist in the order menu
    await expect(page.locator("button").filter({ hasText: /^Import Results$/i })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /^Edit Lab Order$/i })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /^Print Lab Order$/i })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /^Export as PDF$/i })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /^Share by SMS$/i })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /^Specimen Details$/i })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /^Print Test Specimen Label$/i })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /^Mark as Completed$/i })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /^Mark as Expired$/i })).toBeVisible();

    await page.screenshot({ path: resolve(artifactDir, "01_lab_order_9_menu_actions.png") });

    // 5. TEST ACTION 1: "Import Results"
    const importResultsMenuItem = page.locator("button").filter({ hasText: /^Import Results$/i }).first();
    await importResultsMenuItem.click();
    await page.waitForTimeout(800);

    // Verify dedicated Import Results screen opens
    const importHeading = page.locator("h2").filter({ hasText: /^Import Lab Result$/i });
    await expect(importHeading).toBeVisible();

    // Verify it is NOT the Edit Lab Order screen
    await expect(page.locator("h2").filter({ hasText: /^Edit Lab Order$/i })).not.toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /^Add Lab Order$/i })).not.toBeVisible();

    // Verify context header
    await expect(page.locator("text=Ordered By :")).toBeVisible();
    await expect(page.locator("text=Ordered On :")).toBeVisible();
    await expect(page.locator("text=Lab Name :")).toBeVisible();
    await expect(page.locator("text=Specimen Details")).toBeVisible();
    await expect(page.locator("text=Result Date Time")).toBeVisible();

    // Verify File Import Dropzone & Download Sample Template
    await expect(page.locator("text=Import External Laboratory Results File")).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /Download Sample CSV Template/i })).toBeVisible();
    await expect(page.locator("text=Click to browse or drag and drop laboratory result file")).toBeVisible();

    // Verify Analyte Table and action buttons
    const addParamBtn = page.locator("button").filter({ hasText: /Additional Parameter/i }).first();
    await addParamBtn.scrollIntoViewIfNeeded();
    await expect(addParamBtn).toBeVisible();

    const importCompleteBtn = page.locator("button").filter({ hasText: /Import & Complete Order/i }).first();
    await importCompleteBtn.scrollIntoViewIfNeeded();
    await expect(importCompleteBtn).toBeVisible();

    const importPartialBtn = page.locator("button").filter({ hasText: /Import as Partial/i }).first();
    await expect(importPartialBtn).toBeVisible();

    await page.screenshot({ path: resolve(artifactDir, "02_dedicated_import_results_screen.png") });

    // Cancel out of Import Results
    const cancelImportBtn = page.locator("button").filter({ hasText: /^Cancel$/i }).first();
    await cancelImportBtn.click();
    await page.waitForTimeout(600);

    // 6. TEST ACTION 2: "Edit Lab Order"
    const orderRowsAfterCancel = page.locator("tr").filter({ hasText: /Pending|Partial|Completed/i });
    const threeDotBtn2 = orderRowsAfterCancel.first().locator("button.charm-action-btn").or(orderRowsAfterCancel.first().getByRole("button", { name: /Order Actions/i })).first();
    await threeDotBtn2.click();
    await page.waitForTimeout(400);

    const editLabOrderMenuItem = page.locator("button").filter({ hasText: /^Edit Lab Order$/i }).first();
    await editLabOrderMenuItem.click();
    await page.waitForTimeout(800);

    // Verify Edit Lab Order screen opens
    const editOrderHeading = page.locator("h2").filter({ hasText: /^Edit Lab Order$/i });
    await expect(editOrderHeading).toBeVisible();

    // Verify it is NOT the Import Results screen
    await expect(page.locator("h2").filter({ hasText: /^Import Lab Result$/i })).not.toBeVisible();
    await expect(page.locator("text=Import External Laboratory Results File")).not.toBeVisible();

    // Verify Update Order button
    await expect(page.locator("button").filter({ hasText: /^Update Order$/i })).toBeVisible();

    // Verify requisition builder sections
    await expect(page.locator("text=Search & Add")).toBeVisible();
    await expect(page.locator("text=Templates")).toBeVisible();
    await expect(page.locator("text=Note to Lab / Patient")).toBeVisible();
    await expect(page.locator("text=Intra Office Notes")).toBeVisible();

    await page.screenshot({ path: resolve(artifactDir, "03_dedicated_edit_lab_order_screen.png") });

    // Cancel out of Edit Lab Order
    const cancelEditBtn = page.locator("button").filter({ hasText: /^Cancel$/i }).first();
    await cancelEditBtn.click();
    await page.waitForTimeout(600);

    // 7. TEST END-TO-END IMPORT RESULTS EXECUTION
    const threeDotBtn3 = orderRowsAfterCancel.first().locator("button.charm-action-btn").or(orderRowsAfterCancel.first().getByRole("button", { name: /Order Actions/i })).first();
    await threeDotBtn3.click();
    await page.waitForTimeout(400);

    await page.locator("button").filter({ hasText: /^Import Results$/i }).first().click();
    await page.waitForTimeout(800);

    // Enter a result in the first analyte result input
    const firstResultInput = page.locator('input[placeholder="Value..."]').first();
    if (await firstResultInput.isVisible()) {
      await firstResultInput.fill("1.1");
      await page.waitForTimeout(300);
    }

    // Save using Import & Complete Order
    const submitImportBtn = page.locator("button").filter({ hasText: /^Import & Complete Order$/i }).first();
    await submitImportBtn.scrollIntoViewIfNeeded();
    await submitImportBtn.click();
    await page.waitForTimeout(1500);

    // Verify notification toast or return to list
    await expect(page.locator("h2").filter({ hasText: /^Import Lab Result$/i })).not.toBeVisible();
    await page.screenshot({ path: resolve(artifactDir, "04_result_imported_completed.png") });

    // 8. TEST LAB RESULTS TAB: "Edit Lab Result"
    const labResultsTab = page.locator('button, [role="tab"]').filter({ hasText: /^Lab Results$/i }).first();
    await labResultsTab.click();
    await page.waitForTimeout(800);

    const resultRows = page.locator("tr").filter({ hasText: /Normal|Abnormal|Signed|Unsigned/i });
    if (await resultRows.count() > 0) {
      const resThreeDot = resultRows.first().locator("button.charm-action-btn").or(resultRows.first().getByRole("button", { name: /Result Actions/i })).first();
      await resThreeDot.click();
      await page.waitForTimeout(400);

      const editLabResultBtn = page.locator("button").filter({ hasText: /^Edit Lab Result$/i }).first();
      await expect(editLabResultBtn).toBeVisible();
      await editLabResultBtn.click();
      await page.waitForTimeout(800);

      // Verify Edit Lab Result screen opens with "Update" button
      await expect(page.locator("h2").filter({ hasText: /^Edit Lab Result$/i })).toBeVisible();
      await expect(page.locator("button").filter({ hasText: /^Update$/i })).toBeVisible();
      await page.screenshot({ path: resolve(artifactDir, "05_edit_lab_result_screen.png") });

      // Cancel out
      await page.locator("button").filter({ hasText: /^Cancel$/i }).first().click();
    }

    console.log("All critical correction workflows verified successfully!");
  });
});
