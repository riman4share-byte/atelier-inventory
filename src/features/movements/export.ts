import type { DressMovementRow } from './api';
import { neutraliseFormula } from '@/features/dresses/exportData';

/**
 * Movement history as Excel (English-only, per owner decision).
 *
 * The spreadsheet writer is ~800 KB. It is imported here rather than at the
 * top of the module so it only downloads when someone actually exports.
 */
export async function exportMovementsToExcel(
  movements: DressMovementRow[],
  filename: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const rows: Array<Array<string>> = [
    ['Occurred', 'Dress', 'Direction', 'Reason', 'Customer', 'From', 'To', 'Due', 'Deposit', 'Notes'],
    ...movements.map((m) => [
      new Date(m.occurred_at).toISOString(),
      m.dress_id,
      m.direction,
      m.reason,
      m.customer_id ?? '',
      m.from_location ?? '',
      m.to_location,
      m.due_at ? new Date(m.due_at).toISOString() : '',
      m.deposit_amount === null ? '' : String(m.deposit_amount),
      m.condition_notes ?? '',
    ]),
  ];
  // Neutralise spreadsheet formulas: condition notes are free text typed by
  // staff and would otherwise be evaluated when the owner opens the file.
  const safeRows = rows.map((row) => row.map((cell) => neutraliseFormula(cell)));
  const sheet = XLSX.utils.aoa_to_sheet(safeRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Movements');
  XLSX.writeFile(workbook, filename);
}
