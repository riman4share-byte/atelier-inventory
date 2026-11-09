import type { DressRow } from './api';

/**
 * Exports are English-only by owner decision (2026-11-09) — shared files go to
 * customers whom the English descriptions serve. The app UI stays bilingual.
 * Revisit before any Arabic export is promised: a PDF in Arabic needs the
 * letter-shaping proof recorded as G-12 in GAPS.md.
 */

export interface ExportColumn {
  id: string;
  header: string;
  get: (dress: DressRow, origin: string) => string;
}

export const STATUS_LABELS: Record<DressRow['status'], string> = {
  available: 'Available',
  reserved: 'Reserved',
  rented: 'Rented',
  sold: 'Sold',
};

export const LISTING_LABELS: Record<DressRow['listing_type'], string> = {
  sale: 'Sale',
  rent: 'Rent',
  both: 'Sale and rent',
};

const priceText = (price: DressRow['sale_price']): string =>
  price === null ? '' : String(price);

export const DEFAULT_EXPORT_COLUMNS: ReadonlyArray<ExportColumn> = [
  { id: 'code', header: 'Code', get: (d) => d.code },
  { id: 'name_en', header: 'Name', get: (d) => d.name_en },
  { id: 'status', header: 'Status', get: (d) => STATUS_LABELS[d.status] },
  { id: 'listing_type', header: 'Listing', get: (d) => LISTING_LABELS[d.listing_type] },
  { id: 'size_label', header: 'Size', get: (d) => d.size_label ?? '' },
  { id: 'color', header: 'Colour', get: (d) => d.color ?? '' },
  { id: 'fabrics', header: 'Fabrics', get: (d) => d.fabrics.join(', ') },
  { id: 'sale_price', header: 'Sale price', get: (d) => priceText(d.sale_price) },
  { id: 'rent_price', header: 'Rent price', get: (d) => priceText(d.rent_price) },
  { id: 'description_en', header: 'Description', get: (d) => d.description_en ?? '' },
];

/** The QR column the brief asks for; /d/:code goes live in Phase 7. */
export const QR_URL_COLUMN: ExportColumn = {
  id: 'qr_url',
  header: 'QR URL',
  get: (d, origin) => `${origin}/d/${d.code}`,
};

export const EXPORT_DATE_COLUMN: ExportColumn = {
  id: 'created_at',
  header: 'Added on',
  get: (d) => d.created_at.slice(0, 10),
};

/** Excel/CSV columns per row, header first. */
export function exportRows(
  dresses: DressRow[],
  columns: ReadonlyArray<ExportColumn>,
  origin: string,
): Array<Array<string>> {
  return [
    columns.map((column) => column.header),
    ...dresses.map((dress) => columns.map((column) => column.get(dress, origin))),
  ];
}

/**
 * CSV text with every row RFC 4180-escaped. The caller owns the byte-level
 * encoding (UTF-8 + BOM) so Arabic column values survive Excel even though
 * row data is English.
 */
export function toCsv(rows: Array<Array<string>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell))
        .join(','),
    )
    .join('\r\n');
}

/** CSV for Excel: UTF-8 with BOM so it opens with the right encoding. */
export function excelCompatibleCsv(rows: Array<Array<string>>): Uint8Array {
  const text = `${'\uFEFF'}${toCsv(rows)}`;
  return new TextEncoder().encode(text);
}
