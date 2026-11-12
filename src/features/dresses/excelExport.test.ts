import { describe, expect, it } from 'vitest';
import { cellValue, columnWidth, safeSheetName, safeTableName } from './excelExport';
import { neutraliseFormula, DEFAULT_EXPORT_COLUMNS, EXPORT_DATE_COLUMN } from './exportData';
import type { DressRow } from './api';

const dress = {
  code: 'RF-0001',
  name_en: 'Seraphine',
  status: 'available',
  listing_type: 'both',
  size_label: 'M',
  color: 'ivory',
  fabrics: ['lace', 'tulle'],
  sale_price: 1200,
  rent_price: 350,
  description_en: 'A flowing A-line gown.',
  created_at: '2026-11-10T06:09:33.082852+00:00',
  public_token: 'd1c70f7c-e6e5-4e44-aef8-720c08d37630',
} as unknown as DressRow;

/** The export column, bridged into the shape the writer uses. */
const design = (id: string) => {
  const column = [...DEFAULT_EXPORT_COLUMNS, EXPORT_DATE_COLUMN].find((c) => c.id === id)!;
  return {
    id: column.id,
    header: column.header,
    type: column.type,
    width: column.width,
    get: (row: DressRow) => column.get(row, 'https://example.com'),
  };
};

describe('the Excel export', () => {
  it('writes a price as a number so it can be summed', () => {
    const value = cellValue(design('sale_price'), dress, neutraliseFormula);
    expect(typeof value).toBe('number');
    expect(value).toBe(1200);
  });

  it('writes an empty price as empty, not as zero', () => {
    const empty = { ...dress, rent_price: null } as DressRow;
    expect(cellValue(design('rent_price'), empty, neutraliseFormula)).toBe('');
  });

  it('writes a date as a date so it can be sorted', () => {
    const value = cellValue(design('created_at'), dress, neutraliseFormula);
    expect(value).toBeInstanceOf(Date);
    expect((value as Date).getUTCFullYear()).toBe(2026);
  });

  it('keeps a description that looks like a formula as text', () => {
    const risky = { ...dress, description_en: '=HYPERLINK("http://evil","x")' } as DressRow;
    expect(cellValue(design('description_en'), risky, neutraliseFormula)).toBe(
      '=HYPERLINK("http://evil","x")'.replace(/^/, "'"),
    );
  });

  it('sizes a column to its longest value', () => {
    // "Seraphine" is nine characters, plus room for the bold header.
    expect(columnWidth('Name', ['A', 'Seraphine'])).toBe(11);
    // A declared width is respected.
    expect(columnWidth('Name', ['a very long name indeed'], 20)).toBe(20);
    // A very long value does not make a giant column.
    expect(columnWidth('Description', ['x'.repeat(500)])).toBe(60);
    // A short one is not made unusably narrow.
    expect(columnWidth('Size', ['M'])).toBe(9);
  });

  it('gives the table a name Excel accepts', () => {
    expect(safeTableName('Dresses')).toBe('Dresses');
    expect(safeTableName('Dress list')).toBe('Dress_list');
    // A name cannot start with a digit, and cannot look like a cell.
    expect(safeTableName('2026 dresses')).toBe('T_2026_dresses');
    expect(safeTableName('')).toBe('Table1');
  });

  it('gives the sheet a name Excel accepts', () => {
    expect(safeSheetName('Dresses')).toBe('Dresses');
    expect(safeSheetName('a/b*c?d[e]')).toBe('a b c d e');
    expect(safeSheetName('x'.repeat(50))).toHaveLength(31);
  });
});
