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

  if (!page) return;

  const res = await page.evaluate(() => {
    const leftFrame = document.querySelector(".settings-left-frame, #settingsLeft, .left-nav, .setting-nav");
    const subheader = document.querySelector(".inner-frame, .settings-right-frame");
    return {
      leftFrameHtml: leftFrame ? leftFrame.outerHTML.slice(0, 3000) : "no left frame",
      allVisibleLinks: Array.from(document.querySelectorAll("a, button, li")).map(el => el.innerText.trim()).filter(Boolean).slice(0, 50)
    };
  });

  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);

