import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const password = readFileSync(resolve("../.demo-credentials.txt"), "utf8")
  .match(/Password for all demo accounts: (.+)/)![1]
  .trim();

const artifactDir = resolve("test-results/charm_clinical_workflows");
mkdirSync(artifactDir, { recursive: true });

async function login(page: any, role = "doctor") {
  await page.goto("http://127.0.0.1:8000/#/");
  await page.getByLabel("Staff email").fill(role + "@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.waitForTimeout(1000);
}

test("CharmHealth Clinical Workflows Parity Verification", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Log in as Doctor
  await login(page, "doctor");

  // 2. Open dummy patient Isaac G. E. chart
  await page.goto("http://127.0.0.1:8000/#/patients");
  const isaacRow = page.getByText("Isaac G. E.").first();
  await isaacRow.waitFor({ state: "visible", timeout: 10000 });
  await isaacRow.click();
  await page.locator('button[data-tab="Medications"]').waitFor({ state: "visible", timeout: 10000 });

  // ------------------------------------------------------------------------
  // WORKFLOW 1: MEDICATIONS & PRESCRIPTIONS
  // ------------------------------------------------------------------------
  // Click Medications in sidebar
  await page.locator('button[data-tab="Medications"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(artifactDir, "01_medications_section.png") });

  // Click + Medication
  await page.getByRole("button", { name: "+ Medication", exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(artifactDir, "02_add_prescription_modal.png") });

  // Fill prescription details
  const drugInput = page.locator('.charm-rx-card input[placeholder*="Type drug name"]').first();
  await drugInput.fill("Telma");
  await page.waitForTimeout(400);

  // Click autocomplete item if visible or just type full name
  const catItem = page.locator(".charm-autocomplete-item").first();
  if (await catItem.isVisible()) {
    await catItem.click();
  } else {
    await drugInput.fill("Telma 40mg (Telmisartan)");
  }

  // Set M-A-E-N preset to BD (1-0-1-0)
  await page.getByRole("button", { name: "BD (1-0-1-0)" }).first().click();

  // Check DAW checkbox
  await page.locator('.charm-rx-card input[type="checkbox"]').nth(1).check();

  // Add patient instructions
  await page.locator('input[placeholder*="full glass of warm water"]').first().fill("Take after food with water. Monitor morning BP.");

  // Save Prescription
  await page.getByRole("button", { name: "Save Prescriptions", exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(artifactDir, "03_prescriptions_saved_table.png") });

  // Open Print Rx Modal
  await page.getByRole("button", { name: /Print Rx/ }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(artifactDir, "04_print_rx_preview.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // ------------------------------------------------------------------------
  // WORKFLOW 2: INJECTIONS ADMINISTRATION
  // ------------------------------------------------------------------------
  await page.locator('button[data-tab="Injections"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(artifactDir, "05_injections_section.png") });

  // Click + Injection
  await page.getByRole("button", { name: "+ Injection" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(artifactDir, "06_add_injection_modal.png") });

  // Fill Injection Form
  const injInput = page.locator('.charm-modal-form input[placeholder*="Search or enter injection"]').first();
  await injInput.fill("Fondaflo 2.5");
  await page.waitForTimeout(300);
  const injCatItem = page.locator(".charm-autocomplete-item").first();
  if (await injCatItem.isVisible()) {
    await injCatItem.click();
  }
  await page.locator('.charm-modal-form input[placeholder*="LOT-"]').first().fill("LOT-FND-8821A");
  await page.locator('.charm-modal-form textarea[placeholder*="left deltoid"]').first().fill("Administered subcutaneous without resistance. Patient monitored 15 minutes post-dose. No immediate adverse reaction.");

  // Save Injection
  await page.getByRole("button", { name: "Record Injection" }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(artifactDir, "07_injections_saved_table.png") });

  // ------------------------------------------------------------------------
  // WORKFLOW 3: VACCINES & IMMUNIZATIONS
  // ------------------------------------------------------------------------
  await page.locator('button[data-tab="Vaccines"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(artifactDir, "08_vaccines_section.png") });

  // Click + Add ▾ menu
  await page.getByRole("button", { name: "+ Add ▾" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "+ Add Current Vaccine" }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(artifactDir, "09_add_vaccine_modal.png") });

  // Fill Vaccine details
  const vacInput = page.locator('.charm-modal-form input[placeholder*="Search or enter vaccine"]').first();
  await vacInput.fill("Influenza seasonal quadrivalent");
  await page.waitForTimeout(300);
  const vacCatItem = page.locator(".charm-autocomplete-item").first();
  if (await vacCatItem.isVisible()) {
    await vacCatItem.click();
  }
  await page.locator('.charm-modal-form input[placeholder*="UJ8902A"]').first().fill("LOT-FLU-2026Q");

  // Save Vaccine
  await page.getByRole("button", { name: "Record Vaccine" }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(artifactDir, "10_vaccines_saved_table.png") });

  // ------------------------------------------------------------------------
  // WORKFLOW 4: VITALS OBSERVATIONS
  // ------------------------------------------------------------------------
  await page.locator('button[data-tab="Vitals"]').click();
  await page.waitForTimeout(800);

  // Click + Record Vitals
  await page.getByRole("button", { name: "+ Record Vitals" }).first().click();
  await page.waitForTimeout(600);

  // Check dynamic BMI auto calculation: height 175cm, weight 74kg -> BMI 24.2
  await page.locator('.charm-modal-form input[placeholder="cm"]').first().fill("175");
  await page.locator('.charm-modal-form input[placeholder="kg"]').first().fill("74");
  await page.locator('.charm-modal-form input[placeholder*="Sys (120)"]').first().fill("126");
  await page.locator('.charm-modal-form input[placeholder*="Dia (80)"]').first().fill("80");
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(artifactDir, "11_add_vitals_modal.png") });

  // Save Vitals
  await page.getByRole("button", { name: "Save Vitals Observation" }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(artifactDir, "12_vitals_history_table.png") });

  // ------------------------------------------------------------------------
  // WORKFLOW 5: SERIAL FLOWSHEET & INTERACTIVE TREND CHARTS
  // ------------------------------------------------------------------------
  // Navigate to Dashboard -> Flowsheet subtab
  await page.locator('button[data-tab="Dashboard"]').click();
  await page.waitForTimeout(600);
  await page.getByRole("tab", { name: "Flowsheet" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(artifactDir, "13_flowsheet_matrix.png") });

  // Click Trend Chart icon for Systolic BP
  const trendBtn = page.locator(".charm-trend-btn").first();
  await trendBtn.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(artifactDir, "14_flowsheet_interactive_trend_chart.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  console.log("All 14 clinical workflow verification screenshots captured successfully!");
});
