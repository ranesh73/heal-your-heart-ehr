import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const password = readFileSync(resolve(".demo-credentials.txt"), "utf8")
  .match(/Password for all demo accounts: (.+)/)![1]
  .trim();

test.describe("Calendar Settings Features and Horizontal Alignment Verification", () => {
  test("Horizontal alignment and full 2-way sync across settings and calendar", async ({ page }) => {
    // 1. Login
    await page.goto("http://127.0.0.1:8000/#/login");
    await page.fill('input[type="text"], input[name="username"], input[type="email"]', "doctor@demo.local");
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // 2. Navigate to Settings Dashboard
    await page.goto("http://127.0.0.1:8000/#/settings");
    await page.waitForSelector(".charm-settings-content-panel");
    await page.waitForTimeout(500);

    // Screenshot 1: Settings Dashboard
    await page.screenshot({ path: "screenshot_settings_dashboard.png", fullPage: true });

    // Verify Horizontal Alignment of Headings in Row 1
    const facilityH = page.getByRole("heading", { name: "Facility", exact: true });
    const calendarH = page.getByRole("heading", { name: "Calendar", exact: true });
    const patientH = page.getByRole("heading", { name: "Patient", exact: true });
    const templatesH = page.getByRole("heading", { name: "Templates", exact: true });

    await expect(facilityH).toBeVisible();
    await expect(calendarH).toBeVisible();
    await expect(patientH).toBeVisible();
    await expect(templatesH).toBeVisible();

    const boxFacility = await facilityH.boundingBox();
    const boxCalendar = await calendarH.boundingBox();
    const boxPatient = await patientH.boundingBox();
    const boxTemplates = await templatesH.boundingBox();

    console.log("Row 1 Heading Y positions:", {
      Facility: boxFacility?.y,
      Calendar: boxCalendar?.y,
      Patient: boxPatient?.y,
      Templates: boxTemplates?.y,
    });

    // Check that Row 1 headings are horizontally aligned on the same Y-baseline
    expect(boxFacility?.y).toBeDefined();
    expect(Math.abs((boxFacility?.y || 0) - (boxCalendar?.y || 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((boxFacility?.y || 0) - (boxPatient?.y || 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((boxFacility?.y || 0) - (boxTemplates?.y || 0))).toBeLessThanOrEqual(2);

    // Verify Horizontal Alignment of Headings in Row 2
    const questH = page.getByRole("heading", { name: "Questionnaires", exact: true });
    const docsH = page.getByRole("heading", { name: "Documents", exact: true });
    const consultH = page.getByRole("heading", { name: "Consultation", exact: true });
    const trackersH = page.getByRole("heading", { name: "Health Trackers", exact: true });

    const boxQuest = await questH.boundingBox();
    const boxDocs = await docsH.boundingBox();
    const boxConsult = await consultH.boundingBox();
    const boxTrackers = await trackersH.boundingBox();

    console.log("Row 2 Heading Y positions:", {
      Questionnaires: boxQuest?.y,
      Documents: boxDocs?.y,
      Consultation: boxConsult?.y,
      Trackers: boxTrackers?.y,
    });

    expect(Math.abs((boxQuest?.y || 0) - (boxDocs?.y || 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((boxQuest?.y || 0) - (boxConsult?.y || 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((boxQuest?.y || 0) - (boxTrackers?.y || 0))).toBeLessThanOrEqual(2);

    // 3. Test Appointment Status Page
    await page.goto("http://127.0.0.1:8000/#/settings/calendar/appointment-status");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "screenshot_appointment_status.png", fullPage: true });

    // Add new status "+ Status"
    await page.click('button:has-text("+ Status")');
    await page.waitForSelector('input[placeholder="Enter status name"]');
    await page.fill('input[placeholder="Enter status name"]', "Post-CABG Active Rehab");
    // Pick color swatch 7
    const swatches = page.locator('div[style*="cursor: pointer"][style*="border-radius: 4px"]');
    if (await swatches.count() > 6) {
      await swatches.nth(6).click();
    }
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(600);
    await expect(page.locator("text=Post-CABG Active Rehab")).toBeVisible();

    // 4. Test Visit Types Page
    await page.goto("http://127.0.0.1:8000/#/settings/calendar/visit-types");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "screenshot_visit_types.png", fullPage: true });

    // Add new visit type "+ Visit Type"
    await page.click('button:has-text("+ Visit Type")');
    await page.waitForSelector('input[placeholder="e.g. Telehealth, New Patient Visit"]');
    await page.fill('input[placeholder="e.g. Telehealth, New Patient Visit"]', "Cardiac Rehab Intake");
    await page.fill('input[type="number"]', "45");
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(600);
    await expect(page.locator("text=Cardiac Rehab Intake")).toBeVisible();

    // 5. Test Event Types Page
    await page.goto("http://127.0.0.1:8000/#/settings/calendar/event-types");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "screenshot_event_types.png", fullPage: true });

    // 6. Test Provider Timings Page
    await page.goto("http://127.0.0.1:8000/#/settings/calendar/provider-timings");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "screenshot_provider_timings.png", fullPage: true });

    // 7. Test Web Embed Page
    await page.goto("http://127.0.0.1:8000/#/settings/calendar/web-embed");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "screenshot_web_embed.png", fullPage: true });

    // 8. Test Dashboard Calendar integration
    await page.goto("http://127.0.0.1:8000/#/calendar");
    await page.waitForTimeout(1000);

    // Open New Appointment Modal
    const newApptBtn = page.locator('button:has-text("Appointment"), button:has-text("New Appointment")').first();
    await newApptBtn.click();
    await page.waitForSelector('select[aria-label="Status"]');

    // Verify newly added status "Post-CABG Active Rehab" is present in the Status select dropdown
    const statusSelect = page.locator('select[aria-label="Status"]');
    const statusOptions = await statusSelect.locator("option").allTextContents();
    console.log("Appointment Form available statuses count:", statusOptions.length);
    expect(statusOptions.some((opt) => opt.includes("Post-CABG Active Rehab"))).toBe(true);

    // Verify newly added visit type "Cardiac Rehab Intake" is present in the Visit Type select dropdown
    const visitTypeSelect = page.locator('select[aria-label="Visit type"]');
    const visitTypeOptions = await visitTypeSelect.locator("option").allTextContents();
    console.log("Appointment Form available visit types count:", visitTypeOptions.length);
    expect(visitTypeOptions.some((opt) => opt.includes("Cardiac Rehab Intake"))).toBe(true);

    // Take screenshot of the appointment booking modal with dynamic statuses & visit types
    await page.screenshot({ path: "screenshot_appointment_modal_dynamic.png" });
  });
});
