import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("1. Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/");

  // Wait for login or home
  await page.waitForTimeout(1000);
  const isLoginPage = await page.$("input[type='password']");
  if (isLoginPage) {
    console.log("Logging in as doctor@demo.local...");
    await page.fill("input[type='email']", "doctor@demo.local");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForTimeout(1500);
  }

  // Navigate to #/settings
  console.log("2. Navigating to #/settings...");
  await page.evaluate(() => { location.hash = "/settings"; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scripts/test_settings_dash.png" });

  // Click on "Facility List" link in Settings dashboard
  console.log("3. Clicking 'Facility List'...");
  await page.click("text='Facility List'");
  await page.waitForTimeout(1000);
  console.log("Current URL:", page.url());
  await page.screenshot({ path: "scripts/test_facility_list.png" });

  // Verify Facility List content
  const tableRows = await page.$$eval("#facilityList tbody tr", trs => trs.map(tr => tr.innerText.trim()));
  console.log(`Facility table rows count: ${tableRows.length}`);
  console.log("First row:", tableRows[0]?.split("\n")[0]);

  // Click on action menu '...' of first row
  console.log("4. Testing action menu '...' and Manage Members modal...");
  const firstMoreBtn = await page.$("#facilityList tbody tr:first-child .charm-row-more-btn");
  if (firstMoreBtn) {
    await firstMoreBtn.click();
    await page.waitForTimeout(500);
    await page.click("text='Manage Members'");
    await page.waitForTimeout(800);
    await page.screenshot({ path: "scripts/test_manage_members_modal.png" });

    // Close modal
    await page.click(".charm-modal-close");
    await page.waitForTimeout(500);
  }

  // Click on "Facility Members" tab
  console.log("5. Testing 'Facility Members' tab...");
  await page.click("text='Facility Members'");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/test_facility_members.png" });

  // Click on "Facility Resources" tab
  console.log("6. Testing 'Facility Resources' tab...");
  await page.click("text='Facility Resources'");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/test_facility_resources.png" });

  // Click on "Kiosk Setup" tab
  console.log("7. Testing 'Kiosk Setup' tab...");
  await page.click("text='Kiosk Setup'");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/test_kiosk_setup.png" });

  // Click on "Departments" tab
  console.log("8. Testing 'Departments' tab...");
  await page.click("text='Departments'");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/test_departments.png" });

  // Click on "Roles" tab
  console.log("9. Testing 'Roles' tab...");
  await page.click("text='Roles'");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/test_roles.png" });

  // Click on "Notifications" tab
  console.log("10. Testing 'Notifications' tab...");
  await page.click("text='Notifications'");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/test_notifications.png" });

  // Test Back Arrow to Settings
  console.log("11. Testing Back Arrow to Settings...");
  await page.click(".charm-settings-back-arrow-btn");
  await page.waitForTimeout(1000);
  console.log("URL after back:", page.url());
  await page.screenshot({ path: "scripts/test_back_to_dashboard.png" });

  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  await browser.close();
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
