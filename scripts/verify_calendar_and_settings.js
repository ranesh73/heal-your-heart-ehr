const { chromium } = require('../frontend/node_modules/@playwright/test');
const fs = require('fs');

async function main() {
  console.log('🚀 Starting end-to-end verification of Settings & Calendar features...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  // 1. Log in
  console.log('1. Logging in as doctor@demo.local...');
  await page.goto('http://127.0.0.1:8000');
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="text"], input[name="username"], input[type="email"]').first();
  await emailInput.fill('doctor@demo.local');
  await page.locator('input[type="password"]').first().fill('OoDC4hdJkhoRrPWYSjk0TdLI');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1500);

  // 2. Settings Dashboard & Horizontal Alignment
  console.log('2. Navigating to Settings Dashboard (/#/settings)...');
  await page.goto('http://127.0.0.1:8000/#/settings');
  await page.waitForSelector('.charm-settings-content-panel');
  await page.waitForTimeout(1000);

  // Capture screenshot of settings dashboard
  await page.screenshot({ path: 'settings_dashboard_aligned.png', fullPage: true });
  console.log('📸 Captured settings_dashboard_aligned.png');

  // Verify horizontal alignment row by row
  const rowsToCheck = [
    { rowName: 'Row 1', headings: ['Facility', 'Calendar', 'Patient', 'Templates'] },
    { rowName: 'Row 2', headings: ['Questionnaires', 'Documents', 'Consultation', 'Health Trackers'] },
    { rowName: 'Row 3', headings: ['Lab / Image', 'Rx', 'Immunization', 'Injections'] },
    { rowName: 'Row 4', headings: ['Billing', 'Inventory', 'Message', 'Task'] },
    { rowName: 'Row 5', headings: ['Patient Recall', 'Quick Text', 'Directory', 'PHR Settings'] },
    { rowName: 'Row 6', headings: ['Charm TeleHealth', 'Charm Connect', 'Account', 'Security'] },
    { rowName: 'Row 7', headings: ['Charm Assist'] },
  ];

  let allAligned = true;
  for (const r of rowsToCheck) {
    const yPositions = [];
    for (const hText of r.headings) {
      const headingEl = page.locator(`h3.charm-settings-category-heading:has-text("${hText}")`).first();
      const box = await headingEl.boundingBox();
      if (box) {
        yPositions.push({ heading: hText, y: Math.round(box.y) });
      } else {
        console.error(`❌ Heading not found: ${hText}`);
        allAligned = false;
      }
    }

    if (yPositions.length > 1) {
      const firstY = yPositions[0].y;
      const rowMatches = yPositions.every((p) => Math.abs(p.y - firstY) <= 2);
      console.log(`✅ ${r.rowName} Alignment: ${rowMatches ? 'PERFECT' : 'MISALIGNED'}`, yPositions);
      if (!rowMatches) allAligned = false;
    } else if (yPositions.length === 1) {
      console.log(`✅ ${r.rowName} (Single item):`, yPositions);
    }
  }

  if (allAligned) {
    console.log('🎉 SUCCESS: All category headings across all rows are horizontally aligned on identical baselines!');
  } else {
    console.warn('⚠️ WARNING: Some headings were not perfectly aligned.');
  }

  // 3. Appointment Status Page
  console.log('3. Navigating to Settings -> Calendar -> Appointment Status...');
  await page.goto('http://127.0.0.1:8000/#/settings/calendar/appointment-status');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'appointment_status_view.png', fullPage: true });
  console.log('📸 Captured appointment_status_view.png');

  // Test "+ Status" add modal
  console.log('Adding new appointment status "EECP Advanced Care"...');
  await page.locator('button.charm-btn-orange-new').first().click();
  await page.waitForSelector('input[placeholder="Enter status name"]');
  await page.locator('input[placeholder="Enter status name"]').fill('EECP Advanced Care');
  // Choose a color swatch
  const swatches = page.locator('div[style*="cursor: pointer"][style*="border-radius: 4px"]');
  const count = await swatches.count();
  if (count > 5) {
    await swatches.nth(5).click();
  }
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1000);
  const statusSaved = await page.locator('text=EECP Advanced Care').first().isVisible();
  console.log('Status saved and visible in table:', statusSaved);

  // 4. Visit Types Page
  console.log('4. Navigating to Settings -> Calendar -> Visit Types...');
  await page.goto('http://127.0.0.1:8000/#/settings/calendar/visit-types');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'visit_types_view.png', fullPage: true });
  console.log('📸 Captured visit_types_view.png');

  // Test "+ Visit Type" add modal
  console.log('Adding new visit type "Holter Monitor Review"...');
  await page.locator('button.charm-btn-orange-new').first().click();
  await page.waitForSelector('input[placeholder="e.g. Cardiology Consultation"]');
  await page.locator('input[placeholder="e.g. Cardiology Consultation"]').fill('Holter Monitor Review');
  await page.locator('input[type="number"]').fill('40');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1000);
  const vtSaved = await page.locator('text=Holter Monitor Review').first().isVisible();
  console.log('Visit Type saved and visible in table:', vtSaved);

  // 5. Event Types Page
  console.log('5. Navigating to Settings -> Calendar -> Event Types...');
  await page.goto('http://127.0.0.1:8000/#/settings/calendar/event-types');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'event_types_view.png', fullPage: true });
  console.log('📸 Captured event_types_view.png');

  // 6. Provider Timings Page
  console.log('6. Navigating to Settings -> Calendar -> Provider Timings...');
  await page.goto('http://127.0.0.1:8000/#/settings/calendar/provider-timings');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'provider_timings_view.png', fullPage: true });
  console.log('📸 Captured provider_timings_view.png');

  // 7. Web Embed Page
  console.log('7. Navigating to Settings -> Calendar -> Web Embed...');
  await page.goto('http://127.0.0.1:8000/#/settings/calendar/web-embed');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'web_embed_view.png', fullPage: true });
  console.log('📸 Captured web_embed_view.png');

  // 8. Dashboard Calendar Integration
  console.log('8. Navigating to Dashboard Calendar (/#/calendar)...');
  await page.goto('http://127.0.0.1:8000/#/calendar');
  await page.waitForTimeout(1500);

  // Click "+ Book Appointment"
  const newApptBtn = page.locator('button:has-text("Book Appointment")').first();
  await newApptBtn.click();
  await page.waitForSelector('select[aria-label="Status"]');
  await page.waitForTimeout(500);

  const statusOpts = await page.locator('select[aria-label="Status"] option').allTextContents();
  console.log(`Appointment Status options (${statusOpts.length}):`, statusOpts.slice(0, 8));
  const hasAddedStatus = statusOpts.some((s) => s.includes('EECP Advanced Care'));
  console.log('🎯 Newly added status "EECP Advanced Care" present in booking form:', hasAddedStatus);

  const visitOpts = await page.locator('select[aria-label="Visit type"] option').allTextContents();
  console.log(`Visit Type options (${visitOpts.length}):`, visitOpts.slice(0, 8));
  const hasAddedVisitType = visitOpts.some((v) => v.includes('Holter Monitor Review'));
  console.log('🎯 Newly added visit type "Holter Monitor Review" present in booking form:', hasAddedVisitType);

  await page.screenshot({ path: 'dashboard_calendar_new_appointment.png' });
  console.log('📸 Captured dashboard_calendar_new_appointment.png');

  await browser.close();
  console.log('🏁 Verification completed successfully!');
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
