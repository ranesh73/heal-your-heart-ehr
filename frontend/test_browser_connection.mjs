import { chromium } from 'playwright';

async function main() {
  console.log('Launching Chrome channel...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });
  const page = await browser.newPage();
  console.log('Navigating to http://127.0.0.1:5173 ...');
  await page.goto('http://127.0.0.1:5173', { timeout: 15000 });
  const title = await page.title();
  console.log('Page Title:', title);
  const content = await page.textContent('body');
  console.log('Page loaded, body length:', content ? content.length : 0);
  await browser.close();
  console.log('SUCCESS!');
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
