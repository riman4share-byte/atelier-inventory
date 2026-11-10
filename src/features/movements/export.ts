import * as XLSX from 'xlsx';
import type { DressMovementRow } from './api';

/** Movement history as Excel (English-only, per owner decision). */
export function exportMovementsToExcel(movements: DressMovementRow[], filename: string): void {
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
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Movements');
  XLSX.writeFile(workbook, filename);
}
