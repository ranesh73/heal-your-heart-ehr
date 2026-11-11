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

  // Find all elements with scrollHeight > clientHeight
  const scrollInfo = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("*"));
    const scrollables = els.filter(e => e.scrollHeight > e.clientHeight + 10 && e.clientHeight > 100);
    return scrollables.map(e => ({
      tagName: e.tagName,
      id: e.id,
      className: e.className,
      scrollHeight: e.scrollHeight,
      clientHeight: e.clientHeight,
    }));
  });
  console.log("Scrollable elements:", scrollInfo);

  // Scroll the first scrollable element
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("*"));
    const scrollable = els.find(e => e.scrollHeight > e.clientHeight + 10 && e.clientHeight > 100);
    if (scrollable) {
      scrollable.scrollTop = scrollable.scrollHeight / 2;
    }
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: "charm_settings_mid.png" });

  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("*"));
    const scrollable = els.find(e => e.scrollHeight > e.clientHeight + 10 && e.clientHeight > 100);
    if (scrollable) {
      scrollable.scrollTop = scrollable.scrollHeight;
    }
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: "charm_settings_bottom.png" });

  console.log("Saved mid and bottom screenshots!");
}

main().catch(console.error);

