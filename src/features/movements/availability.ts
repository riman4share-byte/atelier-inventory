import type { DressMovementRow, DressReservationRow } from './api';
import type { DressStatus } from '@/lib/database.types';

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

// ---- Availability for a date window -------------------------------------
//
// The question the atelier actually asks is "which dresses are free on the
// 20th?", not "what is this dress's status?". Answering it needs every
// commitment that touches the window, from two tables: movements (a dress
// that left with a due date) and reservations (a dress held for a bride).
//
// One movement detail makes the naive version wrong. A rental returned early
// still carries a due date in the future, so reading `due_at` alone keeps the
// dress booked after it is back on the rail. The outgoing movement is closed
// by the next incoming one for the same dress, and that return time wins.

/** A stretch of days a dress cannot be lent out, from either table. */
export interface BlockingRange {
  dressId: string;
  from: Date;
  /** null while the dress is out with no due date: blocked until it comes back. */
  to: Date | null;
  kind: 'rented' | 'reserved' | 'other';
}

/** A window of days to check, both ends inclusive. */
export interface DateWindow {
  from: Date;
  to: Date;
}

/** `2026-11-20` is the 20th in the atelier, never the 19th through a UTC offset. */
export function parseDay(value: string): Date {
  // A date input always yields YYYY-MM-DD, so the fallbacks never fire; they
  // keep an invalid string from producing a Date that silently blocks nothing.
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

type MovementSlice = Pick<
  DressMovementRow,
  'id' | 'dress_id' | 'direction' | 'reason' | 'occurred_at' | 'due_at' | 'corrects_movement_id'
>;

function reasonKind(reason: MovementSlice['reason']): BlockingRange['kind'] {
  if (reason === 'rental' || reason === 'sale_delivery') return 'rented';
  if (reason === 'fitting') return 'reserved';
  return 'other';
}

/**
 * Every outward movement that still occupies a dress, closed by its return.
 *
 * Movements that have been superseded by a correcting entry are dropped, so a
 * mistyped rental does not block the dress forever.
 */
export function movementBookings(movements: MovementSlice[]): BlockingRange[] {
  const superseded = new Set(
    movements.map((movement) => movement.corrects_movement_id).filter((id): id is string => Boolean(id)),
  );
  const live = movements
    .filter((movement) => !superseded.has(movement.id))
    .slice()
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  // Outgoing movements waiting for their return, per dress, oldest first.
  const open = new Map<string, Array<{ movement: MovementSlice; from: Date; returnedAt: Date | null }>>();
  for (const movement of live) {
    const at = new Date(movement.occurred_at);
    if (Number.isNaN(at.getTime())) continue;

    if (movement.direction === 'out') {
      const stack = open.get(movement.dress_id) ?? [];
      stack.push({ movement, from: at, returnedAt: null });
      open.set(movement.dress_id, stack);
      continue;
    }

    // A return closes the most recent rental still running for this dress.
    const stack = open.get(movement.dress_id);
    const running = stack?.filter((entry) => entry.returnedAt === null) ?? [];
    const entry = running[running.length - 1];
    if (entry) entry.returnedAt = at;
  }

  const ranges: BlockingRange[] = [];
  for (const stack of open.values()) {
    for (const entry of stack) {
      const { movement, from, returnedAt } = entry;
      let to: Date | null;
      if (returnedAt) to = returnedAt;
      else if (movement.reason === 'sale_delivery') to = null; // it left for good
      else if (movement.due_at) to = new Date(movement.due_at);
      else to = null;
      if (to && Number.isNaN(to.getTime())) to = null;
      ranges.push({ dressId: movement.dress_id, from, to, kind: reasonKind(movement.reason) });
    }
  }
  return ranges;
}

/** Active reservations, as day ranges. Cancelled and fulfilled ones are history. */
export function reservationBookings(
  reservations: Array<Pick<DressReservationRow, 'dress_id' | 'from_date' | 'to_date' | 'status'>>,
): BlockingRange[] {
  const ranges: BlockingRange[] = [];
  for (const reservation of reservations) {
    if (reservation.status !== 'active') continue;
    ranges.push({
      dressId: reservation.dress_id,
      from: startOfDay(parseDay(reservation.from_date)),
      to: endOfDay(parseDay(reservation.to_date)),
      kind: 'reserved',
    });
  }
  return ranges;
}

/**
 * Turnover days after a rental: a dress that comes back needs cleaning before
 * it can leave again. 0 keeps the current behaviour until Settings carries it.
 */
export const TURNOVER_DAYS = 0;

/** Push the end of a range out by the atelier's turnover days. */
export function applyBuffer(range: BlockingRange, bufferDays: number): BlockingRange {
  if (bufferDays <= 0 || range.to === null) return range;
  const to = new Date(range.to);
  to.setDate(to.getDate() + bufferDays);
  return { ...range, to };
}

/** True when the range touches any day of the window. */
export function blocksWindow(range: BlockingRange, window: DateWindow): boolean {
  if (range.from > window.to) return false;
  if (range.to === null) return true;
  return range.to >= window.from;
}

export type Availability =
  | { free: true }
  | { free: false; reason: 'sold' }
  | { free: false; reason: 'booked'; range: BlockingRange }
  /**
   * Not free today, for a reason recorded as a state rather than a date: the
   * dress is at the cleaner, with a customer, or marked reserved with no hold
   * in the calendar.
   */
  | { free: false; reason: 'state'; kind: 'status' | 'location'; value: string };

/**
 * Can this dress go out during the window?
 *
 * Sold is final. A booking or reservation is next. Last comes the state the
 * dress is in *now* — rented, reserved, at the cleaner. A gown at the cleaner
 * is not available today, but it is fine for a date next month, so the state
 * only counts when the window contains today.
 */
export function dressAvailability(input: {
  status: DressStatus;
  location: string;
  bookings: BlockingRange[];
  window: DateWindow;
  today?: Date;
}): Availability {
  const { status, location, bookings, window } = input;
  if (status === 'sold') return { free: false, reason: 'sold' };

  const blocking = bookings.find((range) => blocksWindow(range, window));
  if (blocking) return { free: false, reason: 'booked', range: blocking };

  const today = startOfDay(input.today ?? new Date());
  const windowHasToday = today >= startOfDay(window.from) && today <= window.to;
  if (windowHasToday) {
    if (status === 'rented') return { free: false, reason: 'state', kind: 'status', value: 'rented' };
    if (status === 'reserved') return { free: false, reason: 'state', kind: 'status', value: 'reserved' };
    if (location !== 'in_atelier') return { free: false, reason: 'state', kind: 'location', value: location };
  }

  return { free: true };
}
