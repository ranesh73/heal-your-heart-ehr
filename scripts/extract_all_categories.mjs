import fs from "fs";

const html = fs.readFileSync("charm_settings_live.html", "utf8");

// Parse all setuph1 and their options
const regex = /<div class="setuph1"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div class="gray12">([\s\S]*?)<\/div>/g;
let match;
const categories = [];

while ((match = regex.exec(html)) !== null) {
  const name = match[1].replace(/<[^>]+>/g, "").trim();
  const linksHtml = match[2];
  
  // Extract links
  const linkRegex = /<a[^>]*class="stuplink[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let lMatch;
  const options = [];
  while ((lMatch = linkRegex.exec(linksHtml)) !== null) {
    let raw = lMatch[1];
    const hasNew = raw.includes("New") || raw.includes("newIcon");
    let text = raw.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/New/g, "").trim();
    if (text) {
      options.push({ text, hasNew });
    }
  }
  
  categories.push({ name, options });
}

console.log(`Extracted ${categories.length} categories:`);
categories.forEach((c, idx) => {
  console.log(`${idx + 1}. [${c.name}] (${c.options.length} options): ${c.options.map(o => o.text + (o.hasNew ? " [New]" : "")).join(" | ")}`);
});

fs.writeFileSync("charm_categories_live.json", JSON.stringify(categories, null, 2));
