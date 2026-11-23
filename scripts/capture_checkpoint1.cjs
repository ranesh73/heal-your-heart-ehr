const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));

(async () => {
  const outDir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('http://127.0.0.1:8000/#/login');
  await page.waitForTimeout(500);
  await page.locator('[data-testid="demo-login-doctor"]').click();
  await page.locator('[data-testid="login-submit-btn"]').click();
  await page.waitForSelector('.charm-global-sidebar', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 1. Dashboard
  await page.screenshot({ path: path.join(outDir, 'checkpoint1_dashboard.png') });
  console.log('Saved checkpoint1_dashboard.png');

  // 2. Chart Notes
  await page.goto('http://127.0.0.1:8000/#/chart-notes');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'checkpoint1_chart_notes.png') });
  console.log('Saved checkpoint1_chart_notes.png');

  // 3. Patients
  await page.goto('http://127.0.0.1:8000/#/patients');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'checkpoint1_patients.png') });
  console.log('Saved checkpoint1_patients.png');

  // 4. EECP Workspace
  await page.goto('http://127.0.0.1:8000/#/eecp');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'checkpoint1_eecp.png') });
  console.log('Saved checkpoint1_eecp.png');

  await browser.close();
  console.log('All screenshots captured successfully.');
})();
