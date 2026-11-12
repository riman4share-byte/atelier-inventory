import type { DressRow } from './api';
import { neutraliseFormula, type ExportColumn } from './exportData';
import {
  cellValue,
  safeSheetName,
  safeTableName,
  setupPrint,
  styleTable,
  writeBrandHeader,
  writeFooter,
  type ExcelBranding,
  type ExcelColumn,
  type ExcelMeta,
} from '@/features/excel/design';

/**
 * The Excel export of the catalogue.
 *
 * The first version of this wrote a bare grid of cells: no title, no date,
 * no company name, no logo, and no formatting at all. It opened in Excel
 * looking like a list someone typed into a text file. This is the real
 * thing - a sheet that looks like it was made for the atelier.
 *
 * The layout, top to bottom:
 *
 *   [logo]  Riman Fashion                       Dress catalogue
 *           Bridal & Evening Couture            12 dresses
 *           Sharjah, United Arab Emirates       Generated 12 November 2026
 *   ------------------------------------------------------------------
 *   Code | Name | Status | ...                     <- a real Excel table
 *   RF-0001 | Seraphine | Available | ...            <- banded rows
 *   ------------------------------------------------------------------
 *   Prepared by Riman Fashion                      <- the footer
 *
 * The table is a real Excel table, not a range with borders drawn on it:
 * it has filter buttons on the header, banded rows, and a name, so the
 * owner can sort it, filter it and refer to it from a formula.
 */

export {
  cellValue,
  columnWidth,
  safeSheetName,
  safeTableName,
  type ExcelBranding,
  type ExcelMeta,
} from '@/features/excel/design';

export async function buildExcelWorkbook(
  ExcelJS: typeof import('exceljs'),
  dresses: DressRow[],
  columns: ReadonlyArray<ExportColumn>,
  origin: string,
  branding: ExcelBranding,
  meta: ExcelMeta,
): Promise<import('exceljs').Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = branding.atelierName;
  workbook.lastModifiedBy = branding.atelierName;
  workbook.title = meta.title;
  workbook.subject = `Catalogue of ${dresses.length} dresses`;
  workbook.description = meta.summary;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(safeSheetName(meta.sheetName));

  // --- the header block ----------------------------------------------------
  const headerRowIndex = writeBrandHeader(
    sheet,
    workbook,
    branding,
    meta,
    columns.length,
  );

  // --- the table -----------------------------------------------------------
  const values = dresses.map((dress) =>
    columns.map((column) => column.get(dress, origin)),
  );

  // The export columns read a dress and the origin; the shared design reads
  // a row. They are bridged here.
  const designColumns: ReadonlyArray<ExcelColumn<DressRow>> = columns.map((column) => ({
    id: column.id,
    header: column.header,
    type: column.type,
    width: column.width,
    get: (dress: DressRow) => column.get(dress, origin),
  }));

  sheet.addTable({
    name: safeTableName(meta.tableName),
    ref: `A${headerRowIndex}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleLight9',
      showFirstColumn: false,
      showLastColumn: false,
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns: columns.map((column) => ({ name: column.header, filterButton: true })),
    rows: values.map((_rowValues, index) =>
      designColumns.map((designColumn) => {
        const dress = dresses[index];
        if (!dress) return '';
        // The value goes in plain. A cell inside a table cannot carry its
        // own format: ExcelJS writes the whole object into the cell as
        // text, and the sheet ends up showing {"value":3500,...}. The
        // formats are applied to the cells afterwards instead.
        return cellValue(designColumn, dress, neutraliseFormula);
      }),
    ),
  });

  styleTable(sheet, designColumns, headerRowIndex, dresses.length, values);

  // --- the footer and the page ---------------------------------------------
  writeFooter(sheet, branding, meta, headerRowIndex + dresses.length + 2);
  setupPrint(sheet, branding, meta);

  return workbook;
}
