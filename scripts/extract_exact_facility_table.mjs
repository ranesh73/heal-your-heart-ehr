import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";
import { writeFileSync } from "fs";

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
    console.log("No facility page found");
    return;
  }

  const tableHtml = await page.evaluate(() => {
    const table = document.querySelector("#facilityList");
    const container = table?.closest(".settingBg, .v1-setting-container, .main-container, div[id*='facility']");
    const tabs = Array.from(document.querySelectorAll("ul.tabs li, .sub-tabs, .tab-nav, .setting-tabs, a.tab")).map(el => el.outerHTML);
    const topBar = document.querySelector(".header-strip, .top-strip, .setting-header, .page-header")?.outerHTML;
    return {
      tableOuterHTML: table ? table.outerHTML : "not found",
      containerHTML: container ? container.outerHTML.slice(0, 10000) : "not found",
      tabs,
      topBar
    };
  });

  writeFileSync("charm_facility_table_exact.json", JSON.stringify(tableHtml, null, 2), "utf8");
  console.log("Extracted exact table HTML!");
}

main().catch(console.error);

