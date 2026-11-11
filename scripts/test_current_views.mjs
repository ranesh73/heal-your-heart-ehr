import { chromium } from "../frontend/node_modules/playwright/index.mjs";
import { readFileSync } from "fs";

const password = readFileSync(".demo-credentials.txt", "utf8")
  .match(/Password for all demo accounts: (.+)/)[1]
  .trim();

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Login
  await page.goto("http://127.0.0.1:8000/#/");
  await page.getByLabel("Staff email").fill("doctor@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.waitForTimeout(1500);

  // Home
  await page.screenshot({ path: "test_current_home.png" });

  // Patients
  await page.goto("http://127.0.0.1:8000/#/patients");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test_current_patients.png" });

  // Labs
  await page.goto("http://127.0.0.1:8000/#/labs");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test_current_labs.png" });

  // Open first patient
  await page.goto("http://127.0.0.1:8000/#/patients");
  await page.waitForTimeout(1000);
  const firstPat = page.locator(".charm-table tbody tr").first();
  if (await firstPat.isVisible()) {
    await firstPat.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "test_current_patient_dashboard.png" });
  }

  await browser.close();
  console.log("Screenshots captured!");
}

run().catch(console.error);
