import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";
import fs from "fs";

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

  if (!page) {
    console.error("Settings page not found");
    return;
  }

  // Find scrollable container and scroll down
  await page.evaluate(() => {
    // Find element with scrollbar
    const all = Array.from(document.querySelectorAll("*"));
    const scrollable = all.find(el => el.scrollHeight > el.clientHeight && el.clientHeight > 300);
    if (scrollable) {
      scrollable.scrollTop = scrollable.scrollHeight;
    } else {
      window.scrollTo(0, document.body.scrollHeight);
    }
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: "charm_settings_live_lower.png" });
  console.log("Captured charm_settings_live_lower.png");

  // Inspect all links: text, href, onclick
  const linksData = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a, button, span[onclick], div[onclick]"));
    return anchors.map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute("href"),
      onclick: a.getAttribute("onclick"),
      parentClass: a.parentElement ? a.parentElement.className : "",
      category: a.closest(".category, .group, div") ? a.closest(".category, .group, div").querySelector("h1,h2,h3,h4,b,strong")?.innerText : ""
    })).filter(x => x.text);
  });

  fs.writeFileSync("charm_all_links.json", JSON.stringify(linksData, null, 2));
  console.log(`Saved ${linksData.length} links to charm_all_links.json`);
}

main().catch(console.error);

