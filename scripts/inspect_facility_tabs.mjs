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

  const topHtml = await page.evaluate(() => {
    // Find all links or tabs in the entire header area above the table
    const table = document.querySelector("#facilityList");
    let curr = table;
    const parents = [];
    while (curr && curr.tagName !== 'BODY') {
      parents.push({
        tag: curr.tagName,
        id: curr.id,
        className: curr.className,
      });
      curr = curr.parentElement;
    }

    const allTabs = Array.from(document.querySelectorAll("a, li, span, button")).filter(el => {
      const txt = el.innerText.trim();
      return ["Facility", "Facility List", "Facility Members", "Facility Resources", "Kiosk Setup", "Notifications", "Departments", "Roles"].includes(txt);
    }).map(el => ({
      text: el.innerText.trim(),
      tag: el.tagName,
      class: el.className,
      href: el.getAttribute('href'),
      parentClass: el.parentElement?.className
    }));

    const breadcrumbs = Array.from(document.querySelectorAll(".breadcrumb, .v1-breadcrumb, .path, [class*='bread']")).map(el => el.innerText.trim());

    return { parents, allTabs, breadcrumbs };
  });

  console.log(JSON.stringify(topHtml, null, 2));
}

main().catch(console.error);

