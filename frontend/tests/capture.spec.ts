import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const password = readFileSync(resolve("../.demo-credentials.txt"), "utf8")
  .match(/Password for all demo accounts: (.+)/)![1]
  .trim();

const outDir = resolve("../docs/screenshots");
mkdirSync(outDir, { recursive: true });

async function login(page: any, role = "doctor") {
  await page.goto("/");
  await page.getByLabel("Staff email").fill(role + "@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.locator(".charm-home-launcher-container"),
  ).toBeVisible();
}

test("capture clinical screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Login Screen
  await page.goto("/");
  await page.screenshot({ path: resolve(outDir, "01_login_screen.png") });

  // 2. Doctor Dashboard
  await login(page, "doctor");
  await page.screenshot({ path: resolve(outDir, "02_doctor_dashboard.png") });

  // 3. Patients Directory
  await page.locator("nav").getByRole("button", { name: "Patients", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Patients", exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(outDir, "03_patients_directory.png") });

  // 4. Patient Chart (Aarav Demo)
  await page.getByText("Aarav Demo", { exact: true }).first().click();
  await expect(page.getByRole("heading", { name: /Aarav Demo/ })).toBeVisible();
  await page.screenshot({ path: resolve(outDir, "04_patient_chart_overview.png") });

  // 5. Patient Encounters / Consultations (3-pane view)
  const consultTab = page.getByRole("tab", { name: "Consultations", exact: true });
  if (await consultTab.count()) {
    await consultTab.click();
    const openBtn = page.getByRole("button", { name: "Open record" }).first();
    if (await openBtn.count()) {
      await openBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: resolve(outDir, "05_three_pane_consultation.png") });
    }
  }

  // 6. EECP Module
  await page.locator("nav").getByRole("button", { name: "EECP", exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(outDir, "06_eecp_management.png") });

  // 7. Operations / Scheduling
  await page.locator("nav").getByRole("button", { name: "Operations", exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(outDir, "07_operations_scheduling.png") });

  // 8. Administration (Login as admin)
  await page.context().clearCookies();
  await login(page, "admin");
  await page.locator("nav").getByRole("button", { name: "Administration", exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(outDir, "08_administration_catalogs.png") });

  // 9. Billing Ledger (Login as billing)
  await page.context().clearCookies();
  await login(page, "billing");
  await page.locator("nav").getByRole("button", { name: "Operations", exact: true }).click();
  await page.getByRole("tab", { name: "Billing" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(outDir, "09_billing_ledger.png") });
});
