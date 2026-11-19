/**
 * Draws the app mark and writes every icon the app needs:
 *   - public/pwa-192.png, public/pwa-512.png  (the PWA manifest icons)
 *   - android/app/src/main/res/mipmap (the launcher icons)
 *
 * The mark is a gown, drawn as plain SVG so it is exact at every size and
 * needs no image model. The palette is the Workshop one: warm cream paper,
 * amber ink.
 *
 * Local helper - not part of the app.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const playwrightRoot = join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
const browsers = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
let playwrightPath = 'playwright';
if (!existsSync(join(process.cwd(), 'node_modules', 'playwright'))) {
  const found = readdirSync(playwrightRoot)
    .map((name) => join(playwrightRoot, name, 'node_modules', 'playwright'))
    .filter((path) => existsSync(path))
    .find((path) => {
      const core = join(path, '..', 'playwright-core', 'browsers.json');
      if (!existsSync(core)) return false;
      const json = JSON.parse(readFileSync(core, 'utf8'));
      const chromium = json.browsers.find((b) => b.name === 'chromium');
      return chromium && existsSync(join(browsers, `chromium_headless_shell-${chromium.revision}`));
    });
  if (!found) throw new Error('playwright with an installed browser not found');
  playwrightPath = found;
}
const { chromium } = require(playwrightPath);

const CREAM = '#f7f4ee';
const AMBER = '#d4853a';
const AMBER_DEEP = '#a95f1f';

/**
 * The mark. `padding` is the fraction of the canvas kept clear on every
 * side, so the same drawing works as a launcher icon (which Android crops
 * to a circle) and as an adaptive-icon foreground (which is cropped too).
 */
function svg({ size, padding, background, foreground }) {
  const inset = size * padding;
  const inner = size - inset * 2;
  // The drawing is authored in a 400x400 box and scaled into the inner area.
  const scale = inner / 400;
  const offset = inset;
  const gown = `
    <g transform="translate(${offset} ${offset}) scale(${scale})">
      <path d="M181 96 L200 116 L219 96 L231 160 L297 344 L103 344 L169 160 Z" fill="${foreground}"/>
      <rect x="164" y="152" width="72" height="16" rx="3" fill="${AMBER_DEEP}"/>
    </g>`;
  const plate = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${plate}${gown}
  </svg>`;
}

const browser = await chromium.launch();

async function render(markup, size, outPath) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${markup}</body></html>`,
  );
  mkdirSync(join(outPath, '..'), { recursive: true });
  await page.screenshot({ path: outPath, omitBackground: true });
  await page.close();
  console.log(`${outPath} (${size}px)`);
}

// The PWA icons: a cream plate with the gown on it.
for (const size of [192, 512]) {
  await render(svg({ size, padding: 0.14, background: CREAM, foreground: AMBER }), size,
    join(process.cwd(), 'public', `pwa-${size}.png`));
}

// The Android launcher icons.
// Legacy (pre-Android 8): a cream plate with the gown.
const legacy = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];
for (const [dir, size] of legacy) {
  await render(svg({ size, padding: 0.1, background: CREAM, foreground: AMBER }), size,
    join(process.cwd(), 'android', 'app', 'src', 'main', 'res', dir, 'ic_launcher.png'));
}

// Adaptive icon foreground: 108dp canvas, the art inside the 72dp safe zone.
const foreground = [
  ['mipmap-mdpi', 108],
  ['mipmap-hdpi', 162],
  ['mipmap-xhdpi', 216],
  ['mipmap-xxhdpi', 324],
  ['mipmap-xxxhdpi', 432],
];
for (const [dir, size] of foreground) {
  await render(svg({ size, padding: 0.26, background: null, foreground: AMBER }), size,
    join(process.cwd(), 'android', 'app', 'src', 'main', 'res', dir, 'ic_launcher_foreground.png'));
}

await browser.close();
console.log('icons written');
