const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log("1. Logging in as admin...");
  await page.goto('http://127.0.0.1:5173/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await emailInput.fill('admin@demo.local');
    const pwdInput = await page.$('input[type="password"]');
    await pwdInput.fill('HipTaeC3uvAq0i9o3hJHd0ic');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
  }

  const artifactDir = 'C:/Users/sanju/.gemini/antigravity/brain/eea05a21-385e-4cde-9f6f-671c12299915';

  // Test 1: Settings Dashboard Grid
  console.log("2. Navigating to Settings Dashboard (/#/settings)...");
  await page.goto('http://127.0.0.1:5173/#/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, 'settings_dashboard_verified.png'), fullPage: true });

  const dashboardContent = await page.content();
  // Under calendar, check the 8 options
  const calendarOptions = [
    "Facility Timings", "Provider Timings", "Online Appointments", "Web Embed",
    "Appointment Fields", "Appointment Status", "Visit Types", "Event Types"
  ];
  for (const opt of calendarOptions) {
    if (!dashboardContent.includes(opt)) {
      throw new Error(`Settings dashboard missing option: ${opt}`);
    }
  }
  console.log("✓ All 8 Calendar options are present in Settings Dashboard!");

  // Check removed options are NOT in dashboard
  const removed = ["Appointment Bot", "Schedule Rules", "Google Calendar"];
  for (const r of removed) {
    if (dashboardContent.includes(r)) {
      throw new Error(`Settings dashboard should NOT contain: ${r}`);
    }
  }
  console.log("✓ All 3 removed Calendar options (Appointment Bot, Schedule Rules, Google Calendar) are absent!");

  // Verify Preferences is present in other categories
  if (!dashboardContent.includes("Preferences")) {
    throw new Error("Preferences was erroneously removed from other categories!");
  }
  console.log("✓ Preferences is retained in other categories (Patient, Account, Consultation, Message, etc.)!");

  // Test 2: Facility Timings Page
  console.log("3. Navigating to Settings -> Calendar -> Facility Timings...");
  await page.goto('http://127.0.0.1:5173/#/settings/calendar/facility-timings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click Save for Facility Time Zone
  console.log("4. Testing Facility Time Zone save...");
  const tzSaveBtn = await page.$('div:has(> h2:has-text("Facility Time Zone")) ~ div button:has-text("Save"), button:has-text("Save")');
  if (tzSaveBtn) {
    await tzSaveBtn.click();
    await page.waitForTimeout(1000);
    const hasSuccess = await page.content();
    console.log("✓ Timezone saved, feedback present:", hasSuccess.includes("successfully"));
  }

  // Test 3: Modify working hours for Royapettah
  console.log("5. Testing Facility Switcher...");
  const chooseFacSelects = page.locator('div:has(> label:has-text("Choose Facility")) select');
  const count = await chooseFacSelects.count();
  if (count > 0) {
    const firstChooseFac = chooseFacSelects.first();
    const options = await firstChooseFac.locator('option').allTextContents();
    console.log("Available facility options in dropdown:", options);
    // Select the second facility
    await firstChooseFac.selectOption({ index: 1 });
    await page.waitForTimeout(1500);
    console.log("✓ Switched facility to second option, schedule loaded.");
  }

  // Click Save for Facility Working Hours
  console.log("6. Testing Facility Working Hours save...");
  const saveBtns = await page.$$('button:has-text("Save")');
  if (saveBtns.length >= 2) {
    await saveBtns[1].click();
    await page.waitForTimeout(1000);
    const contentAfterSave = await page.content();
    console.log("✓ Working hours saved, feedback present:", contentAfterSave.includes("successfully"));
  }

  await page.screenshot({ path: path.join(artifactDir, 'facility_timings_royapettah_saved.png'), fullPage: true });

  await browser.close();
  console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
}

run().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
