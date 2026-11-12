import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildExcelWorkbook } from '@/features/dresses/excelExport';
import { DEFAULT_EXPORT_COLUMNS, EXPORT_DATE_COLUMN, QR_URL_COLUMN } from './exportData';
import type { DressRow } from './api';

const dress = {
  code: 'RF-0001',
  name_en: 'Seraphine',
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
    const priceCell = sheet.getRow(dataRow).getCell(8);
    expect(priceCell.value).toBe(3500);
    expect(typeof priceCell.value).toBe('number');
    expect(priceCell.numFmt).toContain('AED');

    // The date is a date, not the text of a date.
    const dateCell = sheet.getRow(dataRow).getCell(12);
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
    expect(sheet.getRow(6).getCell(9).value).toBe('');
  });
});
