import fs from "fs";

const html = fs.readFileSync("charm_settings_live.html", "utf8");
const idx = html.indexOf("settingBg");
console.log(html.slice(idx, idx + 6000));
