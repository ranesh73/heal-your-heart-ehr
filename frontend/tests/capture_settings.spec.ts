import { test } from "@playwright/test";

test("capture settings screenshot", async ({ page }) => {
  await page.goto("http://127.0.0.1:8000");
  await page.fill('input[type="text"], input[name="username"], input[type="email"]', "doctor@demo.local");
  await page.fill('input[type="password"]', "OoDC4hdJkhoRrPWYSjk0TdLI");
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*#/);
  await page.goto("http://127.0.0.1:8000/#/settings");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "current_settings.png", fullPage: true });
});

