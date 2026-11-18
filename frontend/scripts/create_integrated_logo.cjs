const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\Kausiq\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe'
  });
  const page = await browser.newPage();
  
  const imgPath = path.resolve('public/images/hyh_logo_transparent.png');
  const imgBase64 = fs.readFileSync(imgPath).toString('base64');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
        canvas { display: block; }
      </style>
    </head>
    <body>
      <canvas id="cv" width="850" height="365"></canvas>
      <script>
        const canvas = document.getElementById('cv');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = 'data:image/png;base64,${imgBase64}';
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          
          // Draw 'EHR'
          // Baseline is y = 262. Capital height is 56px.
          ctx.font = '800 58px "Segoe UI", -apple-system, BlinkMacSystemFont, "Trebuchet MS", sans-serif';
          ctx.fillStyle = '#0d9488';
          ctx.textBaseline = 'alphabetic';
          ctx.letterSpacing = '1px';
          ctx.fillText('EHR', 674, 262);
          
          window.RENDER_DONE = true;
        };
      </script>
    </body>
    </html>
  `;
  
  await page.setContent(html);
  await page.waitForFunction(() => window.RENDER_DONE === true);
  
  const canvasElement = page.locator('#cv');
  const buffer = await canvasElement.screenshot({ omitBackground: true });
  
  fs.writeFileSync('public/images/hyh_logo_ehr.png', buffer);
  if (fs.existsSync('dist/images')) {
    fs.writeFileSync('dist/images/hyh_logo_ehr.png', buffer);
  }
  console.log('Successfully created hyh_logo_ehr.png! Size:', buffer.length);
  
  await browser.close();
})();
