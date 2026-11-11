import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  let page = null;
  for (const c of browser.contexts()) {
    const f = c.pages().find(p => p.url().includes("facilitySettings.do") || p.url().includes("SETTINGS_TAB"));
    if (f) { page = f; break; }
  }
  if (!page) {
    console.log("No page found");
    return;
  }
  const info = await page.evaluate(() => {
    const headerEl = document.querySelector(".header, .v1-top-bar, .sub-header, .settings-header, .filter-cm-brd");
    const fullBodyText = document.body.innerText.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 35);
    return {
      url: location.href,
      title: document.title,
      first35Lines: fullBodyText
    };
  });
  console.log(JSON.stringify(info, null, 2));
}

main().catch(console.error);

