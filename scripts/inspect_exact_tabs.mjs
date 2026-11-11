import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  let page = null;
  for (const c of browser.contexts()) {
    const f = c.pages().find(p => p.url().includes("facilitySettings.do") || p.url().includes("SETTINGS_TAB"));
    if (f) { page = f; break; }
  }
  if (!page) return;
  const tabInfo = await page.evaluate(() => {
    // Find element containing "Facility List" text
    const all = Array.from(document.querySelectorAll("*"));
    const el = all.find(e => e.children.length === 0 && e.innerText.trim() === "Facility List");
    let container = el;
    while (container && !container.classList.contains("tab") && !container.id.includes("tab") && container.parentElement && container.parentElement.tagName !== "BODY") {
      if (container.parentElement.innerText.includes("Facility Members")) {
        container = container.parentElement;
        break;
      }
      container = container.parentElement;
    }
    return {
      outerHTML: container?.outerHTML?.slice(0, 3000),
      className: container?.className,
      tagName: container?.tagName
    };
  });
  console.log(JSON.stringify(tabInfo, null, 2));
}

main().catch(console.error);

