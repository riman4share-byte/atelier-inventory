import type { DressMovementRow } from './api';

/**
 * The dates a dress is booked, derived from its movement history.
 *
 * A rental or reservation that went out (direction 'out') with a due date
 * blocks every day from the day it left to the day it is due back. Sales
 * block the dress forever (it is gone), so a sold dress has no free days at
 * all — that is handled by the caller, who knows the dress status.
 */
export interface BookingRange {
  from: Date;
  to: Date;
  kind: 'rented' | 'reserved' | 'other';
  movementId: string;
}

export function bookingsFromMovements(movements: DressMovementRow[]): BookingRange[] {
  const ranges: BookingRange[] = [];
  for (const movement of movements) {
    if (movement.direction !== 'out') continue;
    if (!movement.due_at) continue;
    const from = new Date(movement.occurred_at);
    const to = new Date(movement.due_at);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) continue;
    if (to < from) continue;
    const kind =
      movement.reason === 'rental' ? 'rented' :
      movement.reason === 'fitting' ? 'reserved' :
      'other';
    ranges.push({ from, to, kind, movementId: movement.id });
  }
  return ranges;
}

/** Every calendar day (as YYYY-MM-DD) covered by at least one booking. */
export function bookedDays(ranges: BookingRange[]): Set<string> {
  const days = new Set<string>();
  for (const range of ranges) {
    const cursor = new Date(range.from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(range.to);
    end.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      days.add(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return days;
}

/** True when the proposed range overlaps any existing booking. */
export function conflictsWithBooking(
  ranges: BookingRange[],
  from: Date,
  to: Date,
): BookingRange | null {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  for (const range of ranges) {
    if (fromMs <= range.to.getTime() && toMs >= range.from.getTime()) {
      return range;
    }
  }
  return null;
}

/** Format a Date as YYYY-MM-DD in local time. */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
