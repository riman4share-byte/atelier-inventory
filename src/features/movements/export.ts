import type { DressMovementRow } from './api';
import { neutraliseFormula } from '@/features/dresses/exportData';
import {
  cellValue,
  formatFor,
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
 * Movement history as Excel (English-only, per owner decision).
 *
 * This used to write the dress and the customer as raw UUIDs. A list of
 * identifiers is not a record of anything: nobody reads a movement history
 * to look up a UUID. The dress's code and name and the customer's name are
 * what the sheet carries now, with the identifiers kept alongside for
 * anyone who needs to match a row back to the app.
 *
 * The sheet has the same shape as the dress catalogue: the atelier's mark
 * at the top, the title and the date, a real Excel table, and a footer.
 */

/** The names the sheet needs: dress codes and customer names. */
export interface MovementNames {
  /** Dress id to "RF-0001 Seraphine". */
  dresses: Record<string, string>;
  /** Customer id to the customer's name. */
  customers: Record<string, string>;
}

const DIRECTION_LABELS: Record<string, string> = {
  out: 'Out',
  in: 'In',
};

const REASON_LABELS: Record<string, string> = {
  rental: 'Rental',
  sale_delivery: 'Sale delivery',
  fitting: 'Fitting',
  alteration: 'Alteration',
  cleaning: 'Cleaning',
  photoshoot: 'Photoshoot',
  return: 'Return',
  other: 'Other',
};

const label = (labels: Record<string, string>, value: string): string =>
  labels[value] ?? value;

export async function exportMovementsToExcel(
  movements: DressMovementRow[],
  filename: string,
  names: MovementNames = { dresses: {}, customers: {} },
  branding?: ExcelBranding,
  meta?: ExcelMeta,
): Promise<void> {
  const ExcelJS = await import('exceljs');

  const atelierName = branding?.atelierName ?? 'Atelier';
  const reportMeta: ExcelMeta = meta ?? {
    title: 'Movement history',
    generatedAt: new Date().toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    summary: `${movements.length} movements in this export`,
    sheetName: 'Movements',
    tableName: 'Movements',
  };

  const columns: ReadonlyArray<ExcelColumn<DressMovementRow>> = [
    {
      id: 'occurred_at',
      header: 'Occurred',
      type: 'datetime' as const,
      width: 18,
      get: (m: DressMovementRow) => m.occurred_at,
    },
    {
      id: 'dress',
      header: 'Dress',
      width: 26,
      get: (m: DressMovementRow) => names.dresses[m.dress_id] ?? m.dress_id,
    },
    {
      id: 'direction',
      header: 'Direction',
      width: 14,
      get: (m: DressMovementRow) => label(DIRECTION_LABELS, m.direction),
    },
    {
      id: 'reason',
      header: 'Reason',
      width: 16,
      get: (m: DressMovementRow) => label(REASON_LABELS, m.reason),
    },
    {
      id: 'customer',
      header: 'Customer',
      width: 24,
      get: (m: DressMovementRow) =>
        m.customer_id ? (names.customers[m.customer_id] ?? m.customer_id) : '',
    },
    {
      id: 'from_location',
      header: 'From',
      width: 16,
      get: (m: DressMovementRow) => m.from_location ?? '',
    },
    {
      id: 'to_location',
      header: 'To',
      width: 16,
      get: (m: DressMovementRow) => m.to_location ?? '',
    },
    {
      id: 'due_at',
      header: 'Due',
      type: 'date' as const,
      width: 14,
      get: (m: DressMovementRow) => m.due_at ?? '',
    },
    {
      id: 'deposit_amount',
      header: 'Deposit',
      type: 'price' as const,
      width: 14,
      get: (m: DressMovementRow) =>
        m.deposit_amount === null ? '' : String(m.deposit_amount),
    },
    {
      id: 'condition_notes',
      header: 'Condition notes',
      width: 44,
      get: (m: DressMovementRow) => m.condition_notes ?? '',
    },
    {
      id: 'dress_id',
      header: 'Dress id',
      width: 38,
      get: (m: DressMovementRow) => m.dress_id,
    },
    {
      id: 'customer_id',
      header: 'Customer id',
      width: 38,
      get: (m: DressMovementRow) => m.customer_id ?? '',
    },
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = atelierName;
  workbook.lastModifiedBy = atelierName;
  workbook.title = reportMeta.title;
  workbook.description = reportMeta.summary;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(safeSheetName(reportMeta.sheetName));

  const headerRowIndex = writeBrandHeader(
    sheet,
    workbook,
    branding ?? { atelierName },
    reportMeta,
    columns.length,
  );

  const values = movements.map((m) => columns.map((column) => column.get(m)));

  sheet.addTable({
    name: safeTableName(reportMeta.tableName),
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
    rows: movements.map((m) =>
      columns.map((column) => {
        const value = cellValue(
          { ...column, get: () => column.get(m) },
          m as never,
          neutraliseFormula,
        );
        if (value instanceof Date || typeof value === 'number') {
          return { value, numFmt: formatFor(column) };
        }
        return value;
      }),
    ),
  });

  styleTable(sheet, columns, headerRowIndex, movements.length, values);
  writeFooter(sheet, branding ?? { atelierName }, reportMeta, headerRowIndex + movements.length + 2);
  setupPrint(sheet, branding ?? { atelierName }, reportMeta);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
