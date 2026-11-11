import { chromium } from "../frontend/node_modules/@playwright/test/index.mjs";
import fs from "fs";

async function main() {
  console.log("Connecting to Chrome on port 9222...");
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  let settingsPage = null;

  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      const url = page.url();
      console.log("Found tab:", url, page.title ? await page.title() : "");
      if (url.includes("SETTINGS_TAB") || url.includes("mySpace.do")) {
        settingsPage = page;
      }
    }
  }

  if (!settingsPage) {
    console.error("Could not find CharmHealth settings page!");
    process.exit(1);
  }

  console.log("Found settings page:", settingsPage.url());

  // Bring to front
  await settingsPage.bringToFront();
  await settingsPage.waitForTimeout(1000);

  // Take screenshot
  await settingsPage.screenshot({ path: "charm_settings_live.png", fullPage: true });
  console.log("Screenshot saved to charm_settings_live.png");

  // Extract all categories, options, links, attributes, and styles
  const data = await settingsPage.evaluate(() => {
    // Top-level info
    const title = document.title;
    const bodyClass = document.body.className;

    // Search input info
    const searchInput = document.querySelector('input[type="text"], input[name*="search"], input[placeholder*="Search"]');
    const searchInfo = searchInput
      ? {
          placeholder: searchInput.getAttribute("placeholder"),
          className: searchInput.className,
          id: searchInput.id,
          outerHTML: searchInput.parentElement ? searchInput.parentElement.outerHTML : searchInput.outerHTML,
          styles: window.getComputedStyle(searchInput).cssText,
        }
      : null;

    // Extract all category containers / headings
    const categories = [];
    // Let's query all headings or sections
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, .category-title, .heading, b, strong, div[class*='cat'], span[class*='cat']"));

    // Find the main container
    const mainContainer = document.querySelector("#settingsDiv, #settingsContainer, .settings-content, #mainDiv, #content, .content") || document.body;

    // Extract all clickable links inside the settings content
    const allLinks = Array.from(document.querySelectorAll("a, button, span[onclick], div[onclick]")).map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        text: el.innerText.trim(),
        href: el.getAttribute("href"),
        onclick: el.getAttribute("onclick"),
        className: el.className,
        id: el.id,
        parentText: el.parentElement ? el.parentElement.innerText.trim().slice(0, 100) : "",
        color: style.color,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    }).filter(item => item.text.length > 0 && item.rect.width > 0);

    // Let's get the whole body HTML (or settings area HTML)
    const settingsArea = document.querySelector("#settings_tab, #settings_content, #contentArea, .settingsTab") || document.querySelector("table") || document.body;

    return {
      title,
      bodyClass,
      searchInfo,
      linksCount: allLinks.length,
      links: allLinks,
      bodyInnerHTML: document.body.innerHTML,
    };
  });

  fs.writeFileSync("charm_settings_live.html", data.bodyInnerHTML);
  delete data.bodyInnerHTML;
  fs.writeFileSync("charm_settings_extracted.json", JSON.stringify(data, null, 2));

  console.log(`Extraction complete! Found ${data.linksCount} links/options.`);
  console.log("HTML saved to charm_settings_live.html");
}

main().catch(err => {
  console.error("Error inspecting live CharmHealth:", err);
  process.exit(1);
});
