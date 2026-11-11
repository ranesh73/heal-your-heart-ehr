import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  for (const c of browser.contexts()) {
    for (const p of c.pages()) {
      console.log("PAGE URL:", p.url());
      if (p.url().includes("facilitySettings.do") || p.url().includes("charmtracker.com")) {
        const tabsHtml = await p.evaluate(() => {
          const navs = Array.from(document.querySelectorAll("ul, ol, div.tab, div.tabs, .sub-tab, .v1-tab, [class*='tab']"));
          for (const n of navs) {
            if (n.innerText.includes("Facility List") && n.innerText.includes("Facility Members")) {
              return { html: n.outerHTML.slice(0, 2000), tag: n.tagName, cls: n.className };
            }
          }
          return { error: "tabs not found in navs", snippet: document.body.innerHTML.slice(0, 1000) };
        });
        console.log("TABS HTML:", JSON.stringify(tabsHtml, null, 2));
      }
    }
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

