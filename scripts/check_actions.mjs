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

  // Check the links and URLs
  const links = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll(".stuplink").forEach(a => {
      list.push({
        text: a.innerText.trim(),
        href: a.getAttribute("href"),
        onclick: a.getAttribute("onclick")
      });
    });
    return list;
  });

  console.log("Sample links and action targets:");
  console.log(links.slice(0, 15));
}

main().catch(console.error);

