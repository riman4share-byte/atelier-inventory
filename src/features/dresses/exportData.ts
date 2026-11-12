import type { DressRow } from './api';
import { categoryLabel } from './categories';

/**
 * Exports are English-only by owner decision (2026-11-09) — shared files go to
 * customers whom the English descriptions serve. The app UI stays bilingual.
 * Revisit before any Arabic export is promised: a PDF in Arabic needs the
 * letter-shaping proof recorded as G-12 in GAPS.md.
 */

/**
 * How a column's value should be treated in the spreadsheet.
 *
 * The CSV is text, so everything is a string there. The spreadsheet is not:
 * a price has to be a number so it can be summed, and a date has to be a
 * date so it can be sorted and filtered. The type says which.
 */
export type ExportValueType = 'text' | 'price' | 'date';

export interface ExportColumn {
  id: string;
  header: string;
  get: (dress: DressRow, origin: string) => string;
  /** How the value is written into the spreadsheet. Defaults to text. */
  type?: ExportValueType;
  /** The width of the column in Excel's units, when it needs one. */
  width?: number;
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
  { id: 'code', header: 'Code', get: (d) => d.code, width: 12 },
  { id: 'name_en', header: 'Name', get: (d) => d.name_en, width: 26 },
  { id: 'category', header: 'Category', get: (d) => categoryLabel(d.category, false), width: 16 },
  { id: 'status', header: 'Status', get: (d) => STATUS_LABELS[d.status], width: 14 },
  { id: 'listing_type', header: 'Listing', get: (d) => LISTING_LABELS[d.listing_type], width: 16 },
  { id: 'size_label', header: 'Size', get: (d) => d.size_label ?? '', width: 10 },
  { id: 'color', header: 'Colour', get: (d) => d.color ?? '', width: 14 },
  { id: 'fabrics', header: 'Fabrics', get: (d) => d.fabrics.join(', '), width: 22 },
  { id: 'sale_price', header: 'Sale price', get: (d) => priceText(d.sale_price), type: 'price', width: 14 },
  { id: 'rent_price', header: 'Rent price', get: (d) => priceText(d.rent_price), type: 'price', width: 14 },
  { id: 'description_en', header: 'Description', get: (d) => d.description_en ?? '', width: 60 },
];

/**
 * The QR column the brief asks for. The link carries the dress's unguessable
 * public token, never its sequential code: a code-based public link would let
 * anyone enumerate the catalogue by incrementing a number.
 */
export const QR_URL_COLUMN: ExportColumn = {
  id: 'qr_url',
  header: 'QR URL',
  get: (d, origin) => `${origin}/d/${d.public_token}`,
  width: 46,
};

export const EXPORT_DATE_COLUMN: ExportColumn = {
  id: 'created_at',
  header: 'Added on',
  get: (d) => d.created_at.slice(0, 10),
  type: 'date',
  width: 14,
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
 * Excel and LibreOffice evaluate a cell that starts with =, +, -, @, tab or
 * CR as a formula. A dress name or description pasted from a supplier could
 * therefore run a formula on the owner's machine when the export is opened —
 * the classic CSV injection that can exfiltrate neighbouring cells.
 *
 * Prefixing the value with a single quote marks it as text. Plain numbers are
 * left alone so a negative amount stays a number.
 */
export function neutraliseFormula(value: string): string {
  if (value === '') return value;
  if (!/^[=+\-@\t\r]/.test(value)) return value;
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  return `'${value}`;
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
        .map((cell) => {
          const safe = neutraliseFormula(cell);
          return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
        })
        .join(','),
    )
    .join('\r\n');
}

/** CSV for Excel: UTF-8 with BOM so it opens with the right encoding. */
export function excelCompatibleCsv(rows: Array<Array<string>>): Uint8Array {
  const text = `${'\uFEFF'}${toCsv(rows)}`;
  return new TextEncoder().encode(text);
}
