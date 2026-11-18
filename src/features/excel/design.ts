/**
 * The look of a spreadsheet from this atelier.
 *
 * Both exports - the dress catalogue and the movement history - are built
 * with this, so they look like two pages of the same document: the atelier's
 * mark at the top, the title and the date, a real Excel table with filter
 * buttons and banded rows, and a quiet footer.
 *
 * The spreadsheet library is not imported here. It is large, and only the
 * exports need it, so the caller loads it on demand.
 */

import type { Cell, Workbook, Worksheet } from 'exceljs';

/** The palette. One ink, one accent, greys between them. */
export const INK = 'FF0B0D0F';
export const MUTED = 'FF5B6470';
export const FAINT = 'FF8B939F';
export const HAIRLINE = 'FFE2E4E9';
export const BAND = 'FFF8F9FA';
export const HEADER_FILL = 'FFEFF1F4';

/** The atelier's currency, and the formats the sheet uses. */
export const CURRENCY_FORMAT = '"AED" #,##0.00';
export const DATE_FORMAT = 'dd mmm yyyy';
export const DATETIME_FORMAT = 'dd mmm yyyy, hh:mm';

/** The smallest width a column may be, so a long word is still readable. */
const MIN_WIDTH = 9;
/** The largest width, so one long description does not push the rest away. */
const MAX_WIDTH = 60;

export interface ExcelBranding {
  /** The atelier's name: "Riman Fashion". */
  atelierName: string;
  /** The logo, as a base64 data URL. Null when there is no logo. */
  logoDataUrl?: string | null;
  /** One line under the name: what it makes and where it is. */
  tagline?: string | null;
  /** How to reach the atelier: phone, email, address. */
  contact?: string | null;
}

export interface ExcelMeta {
  /** The title of the report. */
  title: string;
  /** When it was made, already formatted for people to read. */
  generatedAt: string;
  /** One line of facts: how many dresses, how many listed, and so on. */
  summary: string;
  /** The name of the sheet. */
  sheetName: string;
  /** The name of the table. */
  tableName: string;
}

/** How a column's value should be written into the spreadsheet. */
export type ExcelValueType = 'text' | 'price' | 'date' | 'datetime';

/**
 * One column of the table.
 *
 * It is generic over the kind of row it reads, so the two exports can use
 * their own row shapes without casting.
 */
export interface ExcelColumn<TRow = unknown> {
  id: string;
  header: string;
  /** The value as text. The spreadsheet writer turns it into the right type. */
  get: (row: TRow) => string;
  /** How the value is written. Defaults to text. */
  type?: ExcelValueType;
  /** The width of the column, when it needs one. */
  width?: number;
}

/**
 * How wide a column should be.
 *
 * It is the longest value in it, measured in characters, with a little room
 * for the header. Wide columns are capped, because one long description
 * would otherwise push every other column off the screen.
 */
export function columnWidth(
  header: string,
  values: ReadonlyArray<string>,
  declared?: number,
): number {
  if (declared !== undefined) return declared;
  let longest = header.length;
  for (const value of values) {
    if (value.length > longest) longest = value.length;
  }
  // The header is bold, so it needs a little more room.
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest + 2));
}

/**
 * A table name Excel will accept: letters, digits and underscores, and it
 * cannot look like a cell reference.
 */
export function safeTableName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_');
  if (!cleaned) return 'Table1';
  if (/^[A-Za-z]/.test(cleaned)) return cleaned;
  return `T_${cleaned}`;
}

/** A sheet name Excel will accept: at most 31 characters, no punctuation. */
export function safeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31);
  return cleaned || 'Sheet1';
}

/**
 * The value written into a cell, in the form the spreadsheet wants it.
 *
 * A price is a number so it can be summed. A date is a date so it can be
 * sorted and filtered. Everything else is text, and text that starts with =
 * is made safe first so a supplier's description cannot run a formula on
 * the owner's machine when the file is opened.
 */
export function cellValue<TRow>(
  column: ExcelColumn<TRow>,
  row: TRow,
  neutralise?: (value: string) => string,
): string | number | Date {
  const raw = column.get(row);

  if (column.type === 'price') {
    if (raw === '') return null as unknown as string;
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount : null as unknown as string;
  }

  if (column.type === 'date' || column.type === 'datetime') {
    if (raw === '') return null as unknown as string;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date;
  }

  if (raw === '') return null as unknown as string;
  return neutralise ? neutralise(raw) : raw;
}

/** The number format a column's values use. */
export function formatFor<TRow>(column: ExcelColumn<TRow>): string | undefined {
  if (column.type === 'price') return CURRENCY_FORMAT;
  if (column.type === 'date') return DATE_FORMAT;
  if (column.type === 'datetime') return DATETIME_FORMAT;
  return undefined;
}

/**
 * The kind of image a data URL holds.
 *
 * The type is read from the front of the data URL, where the MIME type
 * lives. It must not be found by searching the string: a 30 KB base64 image
 * contains the letters "svg" by chance about one time in eight, and a
 * search would throw away a perfectly good PNG.
 */
/**
 * Reads the pixel dimensions of a PNG or JPEG from its base64 data URL,
 * so a logo keeps its aspect ratio instead of being forced into a square.
 * Returns null when the format is unsupported or the header is truncated.
 */
export function imageDimensions(dataUrl: string): { width: number; height: number } | null {
  const base64 = dataUrl.split(',')[1];
  if (!base64) return null;
  let bytes: Uint8Array;
  try {
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch {
    return null;
  }

  // PNG: IHDR chunk at offset 16, width (4 bytes) then height (4 bytes).
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    if (bytes.length < 24) return null;
    const width = (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!;
    const height = (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!;
    if (width > 0 && height > 0) return { width, height };
    return null;
  }

  // JPEG: scan for a SOF marker (0xFF 0xC0..0xCF, excluding 0xC4 and 0xCC).
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i < bytes.length - 9) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1]!;
      if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
      if (marker === 0xc4 || marker === 0xcc) { i += 2; continue; }
      if (marker >= 0xc0 && marker <= 0xcf) {
        const height = (bytes[i + 5]! << 8) | bytes[i + 6]!;
        const width = (bytes[i + 7]! << 8) | bytes[i + 8]!;
        if (width > 0 && height > 0) return { width, height };
        return null;
      }
      // Skip this segment.
      const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
      i += 2 + len;
    }
  }

  return null;
}

export function imageKind(dataUrl: string): { mime: string; extension: 'png' | 'jpeg' | 'svg' } {
  const match = /^data:image\/([a-zA-Z0-9+.-]+)\s*;/.exec(dataUrl.trim());
  const mime = (match?.[1] ?? 'png').toLowerCase();
  if (mime === 'svg' || mime === 'svg+xml') return { mime, extension: 'svg' };
  if (mime === 'jpeg' || mime === 'jpg') return { mime, extension: 'jpeg' };
  return { mime, extension: 'png' };
}

/**
 * Writes the header block: the logo, the atelier's name, what it makes, how
 * to reach it, the title of the report and when it was made.
 *
 * It returns the row the table starts on.
 */
export function writeBrandHeader(
  sheet: Worksheet,
  workbook: Workbook,
  branding: ExcelBranding,
  meta: ExcelMeta,
  columnCount: number,
): number {
  const row = 1;
  // The name sits beside the logo, not under it, so the block stays short.
  const textColumn = Math.min(2, Math.max(0, columnCount - 1));
  const lastColumn = columnCount;

  if (branding.logoDataUrl) {
    const { extension } = imageKind(branding.logoDataUrl);
    // Excel will not take an SVG, so a vector logo is left out rather than
    // breaking the file.
    if (extension !== 'svg') {
      const dims = imageDimensions(branding.logoDataUrl);
      const logoWidth = 56;
      const logoHeight = dims ? Math.round((logoWidth * dims.height) / dims.width) : 56;
      const imageId = workbook.addImage({
        base64: branding.logoDataUrl.split(',')[1] ?? branding.logoDataUrl,
        extension,
      });
      sheet.getRow(row).height = Math.max(64, logoHeight + 8);
      sheet.addImage(imageId, {
        tl: { col: 0.08, row: 0.06 },
        ext: { width: logoWidth, height: logoHeight },
        editAs: 'oneCell',
      });
    }
  }

  const nameCell = sheet.getCell(row, textColumn + 1);
  nameCell.value = branding.atelierName;
  nameCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: INK } };
  nameCell.alignment = { vertical: 'middle' };

  if (branding.tagline) {
    const taglineCell = sheet.getCell(row + 1, textColumn + 1);
    taglineCell.value = branding.tagline;
    taglineCell.font = { name: 'Calibri', size: 10, color: { argb: MUTED } };
  }

  if (branding.contact) {
    const contactCell = sheet.getCell(row + 2, textColumn + 1);
    contactCell.value = branding.contact;
    contactCell.font = { name: 'Calibri', size: 10, color: { argb: FAINT } };
  }

  // The report's title and its facts, on the right.
  const titleCell = sheet.getCell(row, lastColumn);
  titleCell.value = meta.title;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: INK } };
  titleCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const generatedCell = sheet.getCell(row + 1, lastColumn);
  generatedCell.value = meta.generatedAt;
  generatedCell.font = { name: 'Calibri', size: 10, color: { argb: MUTED } };
  generatedCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const summaryCell = sheet.getCell(row + 2, lastColumn);
  summaryCell.value = meta.summary;
  summaryCell.font = { name: 'Calibri', size: 9, color: { argb: FAINT } };
  summaryCell.alignment = { horizontal: 'right', vertical: 'middle' };

  return row + 4;
}

/**
 * Styles the table: a header in bold ink on a light fill, banded rows, the
 * prices lined up to the right, and the widths set to the content.
 *
 * The banding is written explicitly rather than left to the table's theme,
 * so the sheet looks the same in Excel, LibreOffice and Google Sheets.
 */
export function styleTable<TRow>(
  sheet: Worksheet,
  columns: ReadonlyArray<ExcelColumn<TRow>>,
  headerRowIndex: number,
  rowCount: number,
  values: ReadonlyArray<ReadonlyArray<string>>,
): void {
  const header = sheet.getRow(headerRowIndex);
  header.height = 22;
  header.eachCell((cell: Cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: INK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: HAIRLINE } },
      top: { style: 'thin', color: { argb: HAIRLINE } },
    };
  });

  for (let index = 0; index < rowCount; index++) {
    const dataRow = sheet.getRow(headerRowIndex + 1 + index);
    const banded = index % 2 === 1;
    // A row whose text wraps is left to grow on its own: fixing the height
    // would cut the description off after one line.
    const wraps = columns.some(
      (column) =>
        column.id === 'description_en' ||
        column.id === 'fabrics' ||
        column.id === 'notes' ||
        column.id === 'condition_notes',
    );
    if (!wraps) dataRow.height = 18;
    dataRow.eachCell((cell: Cell, columnNumber: number) => {
      const column = columns[columnNumber - 1];
      cell.font = { name: 'Calibri', size: 10, color: { argb: INK } };
      cell.alignment = {
        vertical: 'top',
        horizontal: column?.type === 'price' ? 'right' : 'left',
        wrapText: column?.id === 'description_en' || column?.id === 'fabrics' || column?.id === 'notes' || column?.id === 'condition_notes',
      };
      const format = column ? formatFor(column) : undefined;
      if (format) cell.numFmt = format;
      // A date cell needs a real date format, or Excel shows the raw
      // serial number.
      if (column?.type === 'date' || column?.type === 'datetime') {
        if (cell.value instanceof Date) cell.numFmt = format ?? DATE_FORMAT;
      }
      if (banded) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
      }
    });
  }

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = columnWidth(
      column.header,
      values.map((rowValues) => rowValues[index] ?? ''),
      column.width,
    );
  });

  // Freeze the header so the columns stay in sight when the list is long.
  sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];
}

/** Writes the quiet line under the table. */
export function writeFooter(
  sheet: Worksheet,
  branding: ExcelBranding,
  meta: ExcelMeta,
  row: number,
): void {
  const cell = sheet.getCell(row, 1);
  cell.value = `Prepared by ${branding.atelierName} · ${meta.generatedAt}`;
  cell.font = { name: 'Calibri', size: 9, color: { argb: FAINT } };
}

/** Sets the page up for printing: landscape, fitted to the width. */
export function setupPrint(sheet: Worksheet, branding: ExcelBranding, meta: ExcelMeta, headerRowIndex?: number): void {
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 },
  };
  // Repeat the table header on every printed page.
  if (headerRowIndex) {
    sheet.pageSetup.printTitlesRow = `${headerRowIndex}:${headerRowIndex}`;
  }
  sheet.headerFooter = {
    oddHeader: `&L&"Calibri,Bold"${branding.atelierName}&R&"Calibri"${meta.title}`,
    oddFooter: `&L&"Calibri"Prepared by ${branding.atelierName}&R&"Calibri"Page &P of &N`,
  };
}
