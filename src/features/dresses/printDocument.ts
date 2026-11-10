import { DEFAULT_EXPORT_COLUMNS, STATUS_LABELS, LISTING_LABELS, exportRows } from './exportData';
import type { DressRow } from './api';

/**
 * Exports render through the browser's own print-to-PDF: no bundled PDF
 * engine, no cost. English-only by owner decision (see exportData.ts), so no
 * Arabic font or shaping proof is required for these documents.
 *
 * The catalog is magazine-styled: an optional cover page, then exactly one
 * dress per page. Each dress page reserves the photo layout the brief's
 * preview needs (one large front view plus back and detail slots) — until
 * Phase 4 provides real photos those areas render as soft placeholders with
 * the angle name, and the QR codes are generated at export time.
 */

const PAGE_STYLE = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #33202b; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }

    /* ---- cover ---- */
    .cover { display: flex; flex-direction: column; min-height: 255mm;
      padding: 20mm 16mm; background: #fdf6f9; }
    .cover .rule { width: 42mm; border-top: 2px solid #d81b73; margin: 8mm 0; }
    .cover h1 { font-size: 34pt; line-height: 1.15; color: #33202b; }
    .cover .collection { margin-top: 6mm; font-size: 13pt; letter-spacing: 3px;
      text-transform: uppercase; color: #d81b73; }
    .cover .meta { margin-top: 8mm; font-size: 10pt; color: #8a6b7c;
      display: flex; justify-content: space-between; }
    .cover .frame-fill { flex: 1; border: 1.5px solid #f3d9e4; border-radius: 6mm;
      margin-top: 10mm; background:
        radial-gradient(circle at 20% 20%, #fdeef5 0, #fdf6f9 55%); }

    /* ---- editorial header shared by dress pages ---- */
    .dress-page { padding: 10mm 12mm 8mm; }
    .strip { display: flex; justify-content: space-between; align-items: baseline;
      border-bottom: 1.5px solid #f3d9e4; padding-bottom: 3mm; margin-bottom: 6mm; }
    .strip .brand { font-size: 9pt; letter-spacing: 3px; text-transform: uppercase;
      color: #33202b; font-weight: 700; }
    .strip .date { font-size: 8pt; color: #b398a7; }

    /* ---- photo zone: main view + back + detail slots ---- */
    .photos { display: grid; grid-template-columns: 62% 1fr; gap: 4mm;
      height: 128mm; margin-bottom: 6mm; }
    .photos .hero { position: relative; border: 1.5px solid #f3d9e4; border-radius: 4mm;
      background: linear-gradient(160deg, #fff1f6, #fdf6f9);
      display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
    .photos .hero img { position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; }
    .photos .hero .tag, .photos .slot .tag { position: relative; z-index: 1; }
    .photos .col { display: grid; grid-template-rows: 1fr 1fr; gap: 4mm; }
    .photos .slot { position: relative; border: 1.5px solid #f3d9e4; border-radius: 4mm;
      background: #fbf0f5; display: flex; align-items: flex-end;
      justify-content: center; overflow: hidden; }
    .photos .tag { margin: 3mm; font-size: 7.5pt; letter-spacing: 2px;
      text-transform: uppercase; color: #b3869b; }

    /* ---- caption ---- */
    .name { font-size: 17pt; color: #33202b; }
    .idline { margin-top: 1.5mm; font-size: 8.5pt; letter-spacing: 1px;
      color: #8a6b7c; }
    .idline .code { color: #d81b73; font-weight: 700; }
    .desc { margin-top: 3.5mm; font-size: 9.5pt; line-height: 1.5;
      color: #5d4450; max-width: 150mm; }

    .specrow { display: flex; flex-wrap: wrap; gap: 0 8mm; margin-top: 4.5mm; }
    .spec { min-width: 30mm; padding: 2.2mm 0; border-top: 1px solid #f3d9e4; }
    .spec .k { font-size: 7pt; letter-spacing: 2px; text-transform: uppercase;
      color: #b398a7; }
    .spec .v { font-size: 9.5pt; font-weight: 600; color: #33202b; }
    .spec .v.price { font-size: 11pt; font-weight: 700; color: #d81b73; }

    /* ---- footer row: QR right, code left ---- */
    .foot { margin-top: 6mm; display: flex; align-items: flex-end;
      justify-content: space-between; border-top: 1.5px solid #f3d9e4;
      padding-top: 4mm; }
    .foot .follio { font-size: 8pt; color: #8a6b7c; }
    .qr-holder { text-align: center; }
    .qr-holder img { width: 20mm; height: 20mm; }
    .qr-holder .kw { font-size: 6.5pt; letter-spacing: 1.5px;
      text-transform: uppercase; color: #8a6b7c; margin-top: 1mm; }

    /* compact variants kept for quick internal copies */
    .per2 { column-count: 2; column-gap: 8mm; } .per2 .card .photos.duo { height: 90mm; }
    .per4 { column-count: 2; column-gap: 6mm; } .per4 .card .photos.duo { height: 52mm; }
    .card { margin-bottom: 8mm; break-inside: avoid; }
    .card .name { font-size: 12pt; }
    .card .desc { font-size: 8pt; margin-top: 2mm; }
  </style>
`;

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export interface CatalogOptions {
  perPage: 1 | 2 | 4;
  showPrices: boolean;
  atelierName: string;
  /** Pre-rendered QR data URLs keyed by dress code. */
  qrByCode?: Record<string, string>;
  /** Signed display URLs (first photo per dress), keyed by dress code. */
  photoUrlByCode?: Record<string, string>;
}

function specBlock(dress: DressRow, showPrices: boolean): string {
  const base: Array<[string, string, string?]> = [
    ['Listed for', LISTING_LABELS[dress.listing_type]],
    ['Size', dress.size_label ?? '—'],
    ['Colour', dress.color ?? '—'],
    ['Fabrics', dress.fabrics.join(', ') || '—'],
    ['Status', STATUS_LABELS[dress.status]],
  ];
  if (showPrices) {
    base.push(
      ['Sale', dress.sale_price === null ? '—' : String(dress.sale_price), 'price'],
      ['Rent / day', dress.rent_price === null ? '—' : String(dress.rent_price), 'price'],
    );
  }
  return `<div class="specrow">${base
    .map(
      ([key, value, modifier]) =>
        `<div class="spec"><div class="k">${escapeHtml(key)}</div>` +
        `<div class="v${modifier ? ` ${modifier}` : ''}">${escapeHtml(value)}</div></div>`,
    )
    .join('')}</div>`;
}

function qrBlock(dress: DressRow, qrByCode: CatalogOptions['qrByCode']): string {
  const dataUrl = qrByCode?.[dress.code];
  if (!dataUrl) return '';
  return `<div class="qr-holder"><img src="${dataUrl}" alt="QR for ${escapeHtml(dress.code)}">` +
    `<div class="kw">Scan to view online</div></div>`;
}

function photoZone(dress: DressRow, photoUrlByCode: CatalogOptions['photoUrlByCode']): string {
  const url = photoUrlByCode?.[dress.code];
  if (!url) {
    return `<div class="photos">
      <div class="hero"><div class="tag">Front view · ${escapeHtml(dress.code)}</div></div>
      <div class="col">
        <div class="slot"><div class="tag">Back view</div></div>
        <div class="slot"><div class="tag">Detail</div></div>
      </div>
    </div>`;
  }
  return `<div class="photos">
      <div class="hero"><img src="${url}" alt="${escapeHtml(dress.code)} front view">
        <div class="tag">Front view</div></div>
      <div class="col">
        <div class="slot"><div class="tag">Back view</div></div>
        <div class="slot"><div class="tag">Detail</div></div>
      </div>
    </div>`;
}

function dressPage(dress: DressRow, options: CatalogOptions): string {
  return `<div class="page dress-page">
      <div class="strip">
        <span class="brand">${escapeHtml(options.atelierName)}</span>
        <span class="date">${new Date().toLocaleDateString('en-GB')}</span>
      </div>
      ${photoZone(dress, options.photoUrlByCode)}
      <h2 class="name">${escapeHtml(dress.name_en || dress.code)}</h2>
      <div class="idline"><span class="code">${escapeHtml(dress.code)}</span> · ${escapeHtml(STATUS_LABELS[dress.status])}</div>
      ${dress.description_en ? `<p class="desc">${escapeHtml(dress.description_en)}</p>` : ''}
      ${specBlock(dress, options.showPrices)}
      <div class="foot">
        <span class="follio">Code ${escapeHtml(dress.code)}</span>
        ${qrBlock(dress, options.qrByCode)}
      </div>
    </div>`;
}

function compactCard(dress: DressRow, options: CatalogOptions): string {
  return `<div class="card">
      <div class="photos duo" style="height:52mm">
        <div class="hero"><div class="tag">Front · ${escapeHtml(dress.code)}</div></div>
        <div class="slot"><div class="tag">Back</div></div>
      </div>
      <h2 class="name">${escapeHtml(dress.name_en || dress.code)}</h2>
      <div class="idline"><span class="code">${escapeHtml(dress.code)}</span> · ${escapeHtml(STATUS_LABELS[dress.status])}</div>
      ${dress.description_en ? `<p class="desc">${escapeHtml(dress.description_en)}</p>` : ''}
      ${specBlock(dress, options.showPrices)}
      ${qrBlock(dress, options.qrByCode)}
    </div>`;
}

export function buildCatalogHtml(
  dresses: DressRow[],
  options: CatalogOptions,
): string {
  const cover = `<div class="page cover">
      <div class="collection">The collection</div>
      <h1>${escapeHtml(options.atelierName)}</h1>
      <div class="rule"></div>
      <div class="meta"><span>${dresses.length} dresses</span><span>${new Date().toLocaleDateString('en-GB')}</span></div>
      <div class="frame-fill"></div>
    </div>`;

  if (options.perPage === 1) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
      <title>${escapeHtml(options.atelierName)} catalog</title>${PAGE_STYLE}</head>
      <body>${cover}${dresses.map((dress) => dressPage(dress, options)).join('')}</body></html>`;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>${escapeHtml(options.atelierName)} catalog</title>${PAGE_STYLE}</head>
    <body class="per${options.perPage}">
      ${dresses.map((dress) => compactCard(dress, options)).join('')}
    </body></html>`;
}

export interface StockReportInputs {
  atelierName: string;
  counts: Record<DressRow['status'], number>;
}

export function buildStockReportHtml(dresses: DressRow[], inputs: StockReportInputs): string {
  const columns = DEFAULT_EXPORT_COLUMNS.filter((column) => column.id !== 'description_en');
  const headerRow = (exportRows([], columns, '')[0] ?? [])
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join('');
  const body = exportRows(dresses, columns, '')
    .slice(1)
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  const statusText = (status: DressRow['status']) =>
    `${STATUS_LABELS[status]}: <strong>${inputs.counts[status]}</strong>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>${escapeHtml(inputs.atelierName)} stock report</title>${PAGE_STYLE}</head>
    <body class="per1">
      <h1>${escapeHtml(inputs.atelierName)} — stock report</h1>
      <p class="sub">${new Date().toLocaleDateString('en-GB')}</p>
      <div class="tiles">
        <div style="background:#d3f2e4;color:#14804f">${statusText('available')}</div>
        <div style="background:#ffe8c7;color:#a15c00">${statusText('reserved')}</div>
        <div style="background:#e6dcff;color:#5a2fc4">${statusText('rented')}</div>
        <div style="background:#eee3e9;color:#6e5a66">${statusText('sold')}</div>
      </div>
      <table class="report">
        <tr>${headerRow}</tr>
        ${body}
      </table>
    </body></html>`;
}

export function buildHangTagHtml(dress: DressRow, atelierName: string, qrDataUrl: string | undefined): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>Tag ${escapeHtml(dress.code)}</title>
    <style>
      @page { size: 50mm 30mm; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { width: 50mm; height: 30mm; font-family: 'Segoe UI', system-ui, sans-serif;
        color: #33202b; display: flex; align-items: center; padding: 2mm; }
      .qr { width: 22mm; height: 22mm; }
      .qr img { width: 100%; height: 100%; }
      .info { flex: 1; padding-left: 2mm; }
      .brand { font-size: 7pt; letter-spacing: 2px; text-transform: uppercase; color: #b398a7; }
      .code { font-size: 11pt; font-weight: 700; color: #d81b73; margin-top: 1mm; }
      .name { font-size: 8pt; color: #33202b; margin-top: 1mm; line-height: 1.2; }
    </style></head>
    <body>
      <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR">` : ''}</div>
      <div class="info">
        <div class="brand">${escapeHtml(atelierName)}</div>
        <div class="code">${escapeHtml(dress.code)}</div>
        <div class="name">${escapeHtml(dress.name_en || dress.code)}</div>
      </div>
    </body></html>`;
}

export function buildTagSheetHtml(dresses: DressRow[], atelierName: string, qrByCode: Record<string, string> | undefined): string {
  const tags = dresses.map((dress) => {
    const qr = qrByCode?.[dress.code];
    return `<div class="tag">
      <div class="qr">${qr ? `<img src="${qr}" alt="QR">` : ''}</div>
      <div class="info">
        <div class="brand">${escapeHtml(atelierName)}</div>
        <div class="code">${escapeHtml(dress.code)}</div>
        <div class="name">${escapeHtml(dress.name_en || dress.code)}</div>
      </div>
    </div>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>Tags</title>
    <style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #33202b; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
      .tag { border: 0.3mm dashed #d8b4c4; border-radius: 2mm; padding: 2mm;
        display: flex; align-items: center; height: 30mm; break-inside: avoid; }
      .qr { width: 20mm; height: 20mm; flex-shrink: 0; }
      .qr img { width: 100%; height: 100%; }
      .info { flex: 1; padding-left: 2mm; }
      .brand { font-size: 6pt; letter-spacing: 2px; text-transform: uppercase; color: #b398a7; }
      .code { font-size: 9pt; font-weight: 700; color: #d81b73; margin-top: 1mm; }
      .name { font-size: 7pt; color: #33202b; margin-top: 1mm; line-height: 1.2; }
    </style></head>
    <body><div class="grid">${tags}</div></body></html>`;
}

export function printHtml(html: string): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  const trigger = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // printing is best-effort in headless/automated contexts
    }
  };
  const images = Array.from(printWindow.document.images);
  if (images.length === 0) {
    trigger();
    return true;
  }
  let remaining = images.length;
  const onDone = () => {
    remaining -= 1;
    if (remaining <= 0) trigger();
  };
  for (const image of images) {
    if (image.complete) onDone();
    else {
      image.addEventListener('load', onDone, { once: true });
      image.addEventListener('error', onDone, { once: true });
    }
  }
  // Safety net: never leave the print dialog waiting forever.
  setTimeout(trigger, 6000);
  return true;
}

export function buildReceiptHtml(movement: import('@/features/movements/api').DressMovementRow, dressCode: string, atelierName: string): string {
  const e = escapeHtml;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>Receipt</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #33202b; padding: 12mm; max-width: 180mm; }
      h1 { font-size: 16pt; margin-bottom: 2mm; }
      .sub { color: #8a6b7c; font-size: 9pt; margin-bottom: 6mm; }
      .row { display: flex; justify-content: space-between; padding: 2mm 0; border-bottom: 1px solid #f3d9e4; font-size: 10pt; }
      .row .k { color: #8a6b7c; }
      .row .v { font-weight: 600; }
      .sig { margin-top: 12mm; display: flex; gap: 10mm; }
      .sig div { flex: 1; border-top: 1px solid #33202b; padding-top: 2mm; font-size: 8pt; color: #8a6b7c; }
    </style></head>
    <body>
      <h1>${e(atelierName)}</h1>
      <p class="sub">Hand-over / return receipt &middot; ${new Date().toLocaleDateString('en-GB')}</p>
      <div class="row"><span class="k">Dress code</span><span class="v">${e(dressCode)}</span></div>
      <div class="row"><span class="k">Direction</span><span class="v">${e(movement.direction)}</span></div>
      <div class="row"><span class="k">Reason</span><span class="v">${e(movement.reason)}</span></div>
      <div class="row"><span class="k">Occurred</span><span class="v">${new Date(movement.occurred_at).toLocaleString('en-GB')}</span></div>
      ${movement.due_at ? `<div class="row"><span class="k">Due back</span><span class="v">${new Date(movement.due_at).toLocaleDateString('en-GB')}</span></div>` : ''}
      ${movement.deposit_amount !== null ? `<div class="row"><span class="k">Deposit</span><span class="v">${movement.deposit_amount}</span></div>` : ''}
      ${movement.condition_notes ? `<div class="row"><span class="k">Condition</span><span class="v">${e(movement.condition_notes)}</span></div>` : ''}
      <div class="sig"><div>Staff signature</div><div>Customer signature</div></div>
    </body></html>`;
}
