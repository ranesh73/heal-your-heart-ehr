import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  let page = null;
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      if (p.url().includes("SETTINGS_TAB")) {
        page = p;
        break;
      }
    }
  }

  // Click Facility List
  await page.click("a:has-text('Facility List')");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "charm_facility_list_screen.png" });
  console.log("Captured charm_facility_list_screen.png! URL is:", page.url());

  // Go back to settings tab
  await page.goBack();
  await page.waitForTimeout(2000);
}

main().catch(console.error);

