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

  const styles = await page.evaluate(() => {
    function pick(el, props) {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const res = {};
      props.forEach(p => res[p] = cs.getPropertyValue(p));
      return res;
    }

    const props = [
      "color", "background-color", "font-size", "font-family", "font-weight",
      "line-height", "margin", "padding", "border", "border-radius",
      "box-shadow", "display", "width", "max-width", "height"
    ];

    const h1 = document.querySelector(".setuph1");
    const link = document.querySelector(".stuplink");
    const bg = document.querySelector(".settingBg");
    const search = document.querySelector("#searchSettings, input[placeholder*='Search in Settings']");
    const searchBox = search ? search.parentElement : null;
    const badge = document.querySelector(".labresnoti-newIcon");
    const col = document.querySelector(".sett-wdth");

    return {
      categoryHeading: pick(h1, props),
      link: pick(link, props),
      container: pick(bg, props),
      searchInput: pick(search, props),
      searchBox: pick(searchBox, props),
      badge: pick(badge, props),
      column: pick(col, props),
    };
  });

  console.log("Exact CSS Styles from CharmHealth:");
  console.log(JSON.stringify(styles, null, 2));
  fs.writeFileSync("charm_exact_styles.json", JSON.stringify(styles, null, 2));
}

main().catch(console.error);

