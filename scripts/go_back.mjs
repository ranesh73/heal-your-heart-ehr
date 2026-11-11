import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const p = browser.contexts()[0].pages().find(x => x.url().includes("ehr2.charmtracker.com"));
  if (!p) {
    console.log("No ehr2 page found");
    return;
  }

  // Navigate back to Settings main tab
  await p.goto("https://ehr2.charmtracker.com/ehr/physician/mySpace.do?ACTION=SETTINGS_TAB&FACILITY_ID=cfa2e6c79f3682ae98ee2e5ce9d5cc8ab3e573769757a518");
  await p.waitForTimeout(2000);
  console.log("Back on settings page:", p.url());
}

main().catch(console.error);

