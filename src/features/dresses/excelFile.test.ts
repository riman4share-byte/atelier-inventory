import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildExcelWorkbook } from '@/features/dresses/excelExport';
import { DEFAULT_EXPORT_COLUMNS, EXPORT_DATE_COLUMN, QR_URL_COLUMN } from './exportData';
import type { DressRow } from './api';

const dress = {
  code: 'RF-0001',
  name_en: 'Seraphine',
  category: 'wedding',
  status: 'available',
  listing_type: 'both',
  size_label: 'M',
  color: 'ivory',
  fabrics: ['lace'],
  sale_price: 3500,
  rent_price: null,
  description_en: 'A flowing gown.',
  created_at: '2026-11-10T06:09:33.082852+00:00',
  public_token: 'd1c70f7c-e6e5-4e44-aef8-720c08d37630',
} as unknown as DressRow;

/**
 * Find a column by its heading, rather than by its position.
 *
 * The positions used to be written down as numbers, and adding the Category
 * column shifted every price one to the right - the test then failed on the
 * wrong cell, which reads like a broken export but is really a brittle test.
 */
function columnOf(sheet: ExcelJS.Worksheet, headerRow: number, heading: string): number {
  const row = sheet.getRow(headerRow);
  for (let index = 1; index <= row.cellCount; index += 1) {
    if (row.getCell(index).value === heading) return index;
  }
  throw new Error(`no column headed "${heading}"`);
}

/**
 * The real file, built in memory and read back.
 *
 * Writing a cell that carries its own format inside a table looked like it
 * worked, and produced a sheet where every price was the text
 * {"value":3500,"numFmt":"..."}. Only reading the file back finds that.
 */
describe('the Excel file itself', () => {
  it('writes prices as numbers, not as text', async () => {
    const columns = [...DEFAULT_EXPORT_COLUMNS, QR_URL_COLUMN, EXPORT_DATE_COLUMN];
    const workbook = await buildExcelWorkbook(
      ExcelJS,
      [dress],
      columns,
      'https://example.com',
      { atelierName: 'Riman Fashion' },
      {
        title: 'Dress catalogue',
        generatedAt: '12 November 2026',
        summary: '1 dress',
        sheetName: 'Dresses',
        tableName: 'Dresses',
      },
    );
    const buffer = await workbook.xlsx.writeBuffer();

    const check = new ExcelJS.Workbook();
    await check.xlsx.load(buffer);
    const sheet = check.worksheets[0]!;

    // The header block: the name, the title and the date.
    expect(sheet.getCell('C1').value).toBe('Riman Fashion');
    expect(sheet.getCell('A1').value).toBeNull();

    // The table starts below the header block.
    const headerRow = 5;
    expect(sheet.getRow(headerRow).getCell(1).value).toBe('Code');

    const dataRow = headerRow + 1;
    const priceCell = sheet.getRow(dataRow).getCell(columnOf(sheet, headerRow, 'Sale price'));
    expect(priceCell.value).toBe(3500);
    expect(typeof priceCell.value).toBe('number');
    expect(priceCell.numFmt).toContain('AED');

    // The category, in English: the exports are English-only.
    const categoryCell = sheet.getRow(dataRow).getCell(columnOf(sheet, headerRow, 'Category'));
    expect(categoryCell.value).toBe('Wedding dress');

    // The date is a date, not the text of a date.
    const dateCell = sheet.getRow(dataRow).getCell(columnOf(sheet, headerRow, 'Added on'));
    expect(dateCell.value).toBeInstanceOf(Date);
    expect((dateCell.value as Date).getUTCFullYear()).toBe(2026);

    // And nothing anywhere carries the raw JSON of a cell.
    for (let r = 1; r <= sheet.rowCount; r++) {
      sheet.getRow(r).eachCell((cell) => {
        if (typeof cell.value === 'string') {
          expect(cell.value).not.toMatch(/^\{"value"/);
        }
      });
    }
  });

  it('writes an empty price as empty, not as zero', async () => {
    const columns = [...DEFAULT_EXPORT_COLUMNS, QR_URL_COLUMN, EXPORT_DATE_COLUMN];
    const workbook = await buildExcelWorkbook(
      ExcelJS,
      [dress],
      columns,
      'https://example.com',
      { atelierName: 'Riman Fashion' },
      {
        title: 'Dress catalogue',
        generatedAt: '12 November 2026',
        summary: '1 dress',
        sheetName: 'Dresses',
        tableName: 'Dresses',
      },
    );
    const buffer = await workbook.xlsx.writeBuffer();
    const check = new ExcelJS.Workbook();
    await check.xlsx.load(buffer);
    const sheet = check.worksheets[0]!;
    const headerRow = 5;
    expect(sheet.getRow(headerRow + 1).getCell(columnOf(sheet, headerRow, 'Rent price')).value).toBe('');
  });

  it('never carries the software credit', async () => {
    // The credit belongs to the app. The spreadsheet goes to whoever the
    // owner sends it to, and it has no business carrying it.
    const columns = [...DEFAULT_EXPORT_COLUMNS, QR_URL_COLUMN, EXPORT_DATE_COLUMN];
    const workbook = await buildExcelWorkbook(
      ExcelJS,
      [dress],
      columns,
      'https://example.com',
      { atelierName: 'Riman Fashion' },
      {
        title: 'Dress catalogue',
        generatedAt: '12 November 2026',
        summary: '1 dress',
        sheetName: 'Dresses',
        tableName: 'Dresses',
      },
    );
    const buffer = await workbook.xlsx.writeBuffer();
    const check = new ExcelJS.Workbook();
    await check.xlsx.load(buffer);
    const sheet = check.worksheets[0]!;

    // The footer under the table.
    for (let r = 1; r <= sheet.rowCount; r++) {
      sheet.getRow(r).eachCell((cell) => {
        if (typeof cell.value === 'string') {
          expect(cell.value).not.toMatch(/Powered by/i);
        }
      });
    }
    // And the footer printed on the page.
    expect(sheet.headerFooter?.oddFooter ?? '').not.toMatch(/Powered by/i);
    expect(sheet.headerFooter?.oddHeader ?? '').not.toMatch(/Powered by/i);

    // The atelier's own name is still on it, though.
    expect(sheet.headerFooter?.oddFooter ?? '').toContain('Riman Fashion');
  });

  it('names the sheet in English, whatever language the app is in', async () => {
    // Exports are English-only by owner decision (2026-09-09). The sheet
    // name came out in Arabic once, because it was translated like the rest
    // of the interface.
    const columns = [...DEFAULT_EXPORT_COLUMNS, QR_URL_COLUMN, EXPORT_DATE_COLUMN];
    const workbook = await buildExcelWorkbook(
      ExcelJS,
      [dress],
      columns,
      'https://example.com',
      { atelierName: 'Riman Fashion' },
      {
        title: 'Dress catalogue',
        generatedAt: '12 November 2026',
        summary: '1 dress',
        sheetName: 'Dresses',
        tableName: 'Dresses',
      },
    );
    const buffer = await workbook.xlsx.writeBuffer();
    const check = new ExcelJS.Workbook();
    await check.xlsx.load(buffer);
    const sheet = check.worksheets[0]!;
    expect(sheet.name).toBe('Dresses');
    expect(sheet.name).not.toMatch(/[\u0600-\u06FF]/);
  });
});
