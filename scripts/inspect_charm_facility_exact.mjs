import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";
import { writeFileSync } from "fs";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  let page = null;
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      if (p.url().includes("charmtracker.com")) {
        page = p;
        break;
      }
    }
  }

  if (!page) {
    console.log("No charm page found");
    return;
  }

  console.log("Found page:", page.url());

  // Navigate to facility settings if not already there
  if (!page.url().includes("facilitySettings.do")) {
    // Click Facility List or navigate directly
    const facLink = page.locator("a:has-text('Facility List')").first();
    if (await facLink.isVisible()) {
      await facLink.click();
      await page.waitForTimeout(3000);
    }
  }

  console.log("Active URL:", page.url());
  await page.screenshot({ path: "charm_facility_exact.png", fullPage: true });

  const info = await page.evaluate(() => {
    return {
      title: document.title,
      h1: Array.from(document.querySelectorAll("h1, h2, h3, h4, .page-title, .title, .heading")).map(el => ({ tag: el.tagName, text: el.innerText.trim(), class: el.className })),
      tabs: Array.from(document.querySelectorAll(".tab, .tabs a, ul.tabs li, [role='tab'], .sub-tabs a, .nav-tabs li")).map(el => ({ text: el.innerText.trim(), class: el.className, href: el.getAttribute("href") })),
      buttons: Array.from(document.querySelectorAll("button, input[type='button'], .btn, a.button, a.btn")).map(el => ({ text: el.innerText.trim() || el.value, class: el.className, id: el.id })),
      tables: Array.from(document.querySelectorAll("table")).map(t => ({
        class: t.className,
        id: t.id,
        headers: Array.from(t.querySelectorAll("th")).map(th => th.innerText.trim()),
        rowCount: t.querySelectorAll("tbody tr").length
      })),
      bodyHtmlSnippet: document.querySelector("#content, .content, #main, .main, body")?.innerHTML?.slice(0, 10000)
    };
  });

  writeFileSync("charm_facility_dom_info.json", JSON.stringify(info, null, 2), "utf8");
  console.log("Extracted facility DOM info successfully!");
}

main().catch(console.error);

