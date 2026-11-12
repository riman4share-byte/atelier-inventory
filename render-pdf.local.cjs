const { chromium } = require('C:/Users/KAIS/AppData/Local/Temp/opencode/pw/node_modules/playwright/index.js');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const OUT = 'C:/Users/KAIS/AppData/Local/Temp/opencode/tablet';
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\KAIS\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe',
  });

  for (const [file, name, width, height] of [
    ['Riman-Fashion-Hang-Tag-Sample.pdf', 'tag-sample', 420, 260],
    ['Riman-Fashion-Stock-Report.pdf', 'stock-report', 1240, 1754],
  ]) {
    const full = path.resolve('C:/Users/KAIS/Downloads/atelier-documents', file);
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    await page.goto('file:///' + full.replace(/\\/g, '/'), { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/pdf-${name}.png` });
    console.log('rendered', name);
    await page.close();
  }

  await browser.close();
  process.exit(0);
})();
