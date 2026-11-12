// Builds the real PDF catalogue, the stock report and the tags from the live
// catalogue, so the files can be opened and looked at.
import fs from 'node:fs';
import { chromium } from 'file:///C:/Users/KAIS/AppData/Local/Temp/opencode/pw/node_modules/playwright/index.mjs';

const URL = 'https://ofnkpyzmzhxtpwwvrbci.supabase.co';
const KEY = process.env.SB_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const OUT = 'C:/Users/KAIS/Downloads/atelier-documents';

fs.mkdirSync(OUT, { recursive: true });

async function get(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: H });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

const dresses = await get('dresses?select=*&deleted_at=is.null&order=code');
const settings = (await get('app_settings?select=*&id=eq.1'))[0];

const logoUrl = settings.logo_path
  ? `${URL}/storage/v1/object/public/atelier-logo/${settings.logo_path}`
  : null;

// The three photographs per dress, keyed by dress code.
const photoUrlsByCode = {};
for (const dress of dresses) {
  const photos = await get(
    `dress_photos?select=original_path,angle,sort_order&dress_id=eq.${dress.id}&order=sort_order`,
  );
  if (!photos.length) continue;
  const found = { front: photos[0].original_path };
  for (const row of photos.slice(1)) {
    if (!found.back && (row.angle === 'back' || row.angle === 'side')) found.back = row.original_path;
    if (!found.detail && (row.angle === 'detail' || row.angle === 'neckline')) found.detail = row.original_path;
  }
  const urls = {};
  for (const slot of ['front', 'back', 'detail']) {
    const path = found[slot];
    if (!path) continue;
    const s = await fetch(`${URL}/storage/v1/object/sign/dress-originals/${path}`, {
      method: 'POST', headers: H, body: JSON.stringify({ expiresIn: 3600 }),
    });
    const sj = await s.json();
    urls[slot] = `${URL}/storage/v1${sj.signedURL}`;
  }
  if (Object.keys(urls).length) photoUrlsByCode[dress.code] = urls;
}

// The QR codes.
const { default: QRCode } = await import('file:///E:/inventory%20app/node_modules/qrcode/lib/index.js');
const qrByCode = {};
for (const dress of dresses) {
  qrByCode[dress.code] = await QRCode.toDataURL(
    `https://atelier-inventory.pages.dev/d/${dress.public_token}`,
    { margin: 1, width: 240 },
  );
}

const print = await import('./src/features/dresses/printDocument.ts');

const common = {
  atelierName: settings.atelier_name,
  logoUrl,
  tagline: settings.tagline,
  contact: settings.contact,
};

const documents = {
  'Riman-Fashion-Catalogue': print.buildCatalogHtml(dresses, {
    perPage: 1, showPrices: true, ...common, qrByCode, photoUrlsByCode,
  }),
  'Riman-Fashion-Catalogue-4-up': print.buildCatalogHtml(dresses, {
    perPage: 4, showPrices: true, ...common, qrByCode, photoUrlsByCode,
  }),
  'Riman-Fashion-Stock-Report': print.buildStockReportHtml(dresses, {
    atelierName: settings.atelier_name,
    logoUrl,
    counts: dresses.reduce((acc, d) => {
      acc[d.status] += 1;
      return acc;
    }, { available: 0, reserved: 0, rented: 0, sold: 0 }),
  }),
  'Riman-Fashion-Hang-Tags': print.buildTagSheetHtml(dresses, settings.atelier_name, qrByCode, logoUrl),
};

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\KAIS\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe',
});

for (const [name, html] of Object.entries(documents)) {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.pdf({ path: `${OUT}/${name}.pdf`, format: 'A4', printBackground: true });
  fs.writeFileSync(`${OUT}/${name}.html`, html);
  console.log('wrote', `${name}.pdf`);
  await page.close();
}

// The hang tag on its own, at the size it is cut to.
const tagPage = await browser.newPage({ viewport: { width: 400, height: 260 }, deviceScaleFactor: 3 });
await tagPage.setContent(documents['Riman-Fashion-Hang-Tags'], { waitUntil: 'networkidle' });
await tagPage.waitForTimeout(2000);
await tagPage.pdf({
  path: `${OUT}/Riman-Fashion-Hang-Tag-Sample.pdf`,
  width: '50mm',
  height: '30mm',
  printBackground: true,
});
console.log('wrote Riman-Fashion-Hang-Tag-Sample.pdf');

await browser.close();
process.exit(0);
