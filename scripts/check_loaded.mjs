import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  let page = null;
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      if (p.url().includes("facilitySettings.do")) {
        page = p;
        break;
      }
    }
  }

  if (!page) {
    console.log("Looking for any ehr2 page...");
    for (const ctx of browser.contexts()) {
      for (const p of ctx.pages()) {
        if (p.url().includes("ehr2.charmtracker.com")) {
          page = p;
          break;
        }
      }
    }
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: "charm_facility_loaded.png" });
  console.log("Current URL:", page.url());
}

main().catch(console.error);

