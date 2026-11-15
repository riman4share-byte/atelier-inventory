import { describe, expect, it } from 'vitest';
import {
  applyBuffer,
  blocksWindow,
  dayKey,
  dressAvailability,
  endOfDay,
  movementBookings,
  parseDay,
  reservationBookings,
  startOfDay,
  type BlockingRange,
} from './availability';

type Movement = Parameters<typeof movementBookings>[0][number];
type Reservation = Parameters<typeof reservationBookings>[0][number];

function movement(overrides: Partial<Movement> & Pick<Movement, 'id' | 'direction'>): Movement {
  return {
    dress_id: 'dress-1',
    reason: 'rental',
    occurred_at: '2026-11-10T09:00:00.000Z',
    due_at: '2026-11-15T09:00:00.000Z',
    corrects_movement_id: null,
    ...overrides,
  };
}

function reservation(
  overrides: Partial<Reservation> & Pick<Reservation, 'from_date' | 'to_date'>,
): Reservation {
  return {
    dress_id: 'dress-1',
    status: 'active',
    ...overrides,
  };
}

const day = (value: string) => startOfDay(parseDay(value));
const window = (from: string, to: string) => ({ from: day(from), to: endOfDay(parseDay(to)) });

describe('parseDay', () => {
  it('reads a day as local midnight, not UTC midnight', () => {
    const parsed = parseDay('2026-11-20');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(10);
    expect(parsed.getDate()).toBe(20);
    expect(parsed.getHours()).toBe(0);
  });

  it('round-trips through dayKey', () => {
    expect(dayKey(parseDay('2026-03-01'))).toBe('2026-03-01');
  });
});

describe('movementBookings', () => {
  it('blocks from the day it left to the day it is due back', () => {
    const [range] = movementBookings([movement({ id: 'm1', direction: 'out' })]);
    expect(range?.dressId).toBe('dress-1');
    expect(range?.kind).toBe('rented');
    expect(range?.to?.toISOString()).toBe('2026-11-15T09:00:00.000Z');
  });

  it('ends the block at the return, not at the due date, when the dress comes back early', () => {
    const ranges = movementBookings([
      movement({ id: 'm1', direction: 'out', due_at: '2026-11-15T09:00:00.000Z' }),
      movement({ id: 'm2', direction: 'in', reason: 'return', occurred_at: '2026-11-12T09:00:00.000Z' }),
    ]);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]?.to?.toISOString()).toBe('2026-11-12T09:00:00.000Z');
  });

  it('keeps a dress blocked forever when it left with no due date', () => {
    const [range] = movementBookings([movement({ id: 'm1', direction: 'out', due_at: null })]);
    expect(range?.to).toBeNull();
  });

  it('treats a sale delivery as gone for good', () => {
    const [range] = movementBookings([
      movement({ id: 'm1', direction: 'out', reason: 'sale_delivery', due_at: '2026-11-15T09:00:00.000Z' }),
    ]);
    expect(range?.to).toBeNull();
  });

  it('drops a movement that a correcting entry supersedes', () => {
    const ranges = movementBookings([
      movement({ id: 'm1', direction: 'out' }),
      movement({
        id: 'm2',
        direction: 'in',
        reason: 'return',
        occurred_at: '2026-11-10T10:00:00.000Z',
        corrects_movement_id: 'm1',
      }),
    ]);
    expect(ranges).toEqual([]);
  });

  it('closes a fitting as a reservation, not a rental', () => {
    const [range] = movementBookings([
      movement({ id: 'm1', direction: 'out', reason: 'fitting', due_at: '2026-11-12T09:00:00.000Z' }),
    ]);
    expect(range?.kind).toBe('reserved');
  });

  it('handles two dresses independently', () => {
    const ranges = movementBookings([
      movement({ id: 'm1', direction: 'out', dress_id: 'a' }),
      movement({ id: 'm2', direction: 'out', dress_id: 'b', occurred_at: '2026-12-01T09:00:00.000Z' }),
    ]);
    expect(ranges.map((range) => range.dressId).sort()).toEqual(['a', 'b']);
  });

  it('adds a second block when a dress goes out twice', () => {
    const ranges = movementBookings([
      movement({ id: 'm1', direction: 'out', occurred_at: '2026-11-01T09:00:00.000Z', due_at: '2026-11-05T09:00:00.000Z' }),
      movement({ id: 'm2', direction: 'in', reason: 'return', occurred_at: '2026-11-05T18:00:00.000Z' }),
      movement({ id: 'm3', direction: 'out', occurred_at: '2026-11-20T09:00:00.000Z', due_at: '2026-11-24T09:00:00.000Z' }),
    ]);
    expect(ranges).toHaveLength(2);
  });
});

describe('reservationBookings', () => {
  it('covers both the first and the last day of the hold', () => {
    const [range] = reservationBookings([reservation({ from_date: '2026-11-18', to_date: '2026-11-20' })]);
    expect(range?.kind).toBe('reserved');
    expect(blocksWindow(range!, window('2026-11-18', '2026-11-18'))).toBe(true);
    expect(blocksWindow(range!, window('2026-11-20', '2026-11-20'))).toBe(true);
  });

  it('ignores cancelled and fulfilled holds', () => {
    const ranges = reservationBookings([
      reservation({ from_date: '2026-11-18', to_date: '2026-11-20', status: 'cancelled' }),
      reservation({ from_date: '2026-11-01', to_date: '2026-11-02', status: 'fulfilled' }),
    ]);
    expect(ranges).toEqual([]);
  });
});

describe('blocksWindow', () => {
  const range: BlockingRange = {
    dressId: 'dress-1',
    from: day('2026-11-10'),
    to: endOfDay(parseDay('2026-11-15')),
    kind: 'rented',
  };

  it('overlaps a window inside the block', () => {
    expect(blocksWindow(range, window('2026-11-12', '2026-11-12'))).toBe(true);
  });

  it('overlaps a window that starts before and ends inside', () => {
    expect(blocksWindow(range, window('2026-11-01', '2026-11-12'))).toBe(true);
  });

  it('does not overlap a window that starts after the block', () => {
    expect(blocksWindow(range, window('2026-11-16', '2026-11-16'))).toBe(false);
  });

  it('does not overlap a window that ends before the block', () => {
    expect(blocksWindow(range, window('2026-11-01', '2026-11-09'))).toBe(false);
  });

  it('always overlaps an open-ended block', () => {
    expect(blocksWindow({ ...range, to: null }, window('2030-01-01', '2030-01-02'))).toBe(true);
  });
});

describe('applyBuffer', () => {
  const range: BlockingRange = {
    dressId: 'dress-1',
    from: day('2026-11-10'),
    to: endOfDay(parseDay('2026-11-15')),
    kind: 'rented',
  };

  it('leaves the range alone when there is no turnover', () => {
    expect(applyBuffer(range, 0)).toBe(range);
  });

  it('holds the dress for cleaning days after the return', () => {
    const buffered = applyBuffer(range, 2);
    expect(blocksWindow(buffered, window('2026-11-17', '2026-11-17'))).toBe(true);
    expect(blocksWindow(buffered, window('2026-11-18', '2026-11-18'))).toBe(false);
  });

  it('does not invent an end for an open-ended block', () => {
    expect(applyBuffer({ ...range, to: null }, 3).to).toBeNull();
  });
});

describe('dressAvailability', () => {
  const when = window('2026-11-20', '2026-11-20');
  const today = day('2026-11-10');

  it('offers a dress nothing is holding', () => {
    expect(dressAvailability({ status: 'available', location: 'in_atelier', bookings: [], window: when, today }))
      .toEqual({ free: true });
  });

  it('never offers a sold dress', () => {
    expect(dressAvailability({ status: 'sold', location: 'in_atelier', bookings: [], window: when, today }))
      .toEqual({ free: false, reason: 'sold' });
  });

  it('reports the block that stands in the way', () => {
    const booking: BlockingRange = {
      dressId: 'dress-1',
      from: day('2026-11-19'),
      to: endOfDay(parseDay('2026-11-21')),
      kind: 'rented',
    };
    const result = dressAvailability({
      status: 'available',
      location: 'in_atelier',
      bookings: [booking],
      window: when,
      today,
    });
    expect(result.free).toBe(false);
    expect(result).toMatchObject({ reason: 'booked', range: booking });
  });

  it('withholds a dress that is at the cleaner today', () => {
    const result = dressAvailability({
      status: 'available',
      location: 'cleaning',
      bookings: [],
      window: window('2026-11-10', '2026-11-10'),
      today,
    });
    expect(result).toMatchObject({ free: false, reason: 'state', kind: 'location', value: 'cleaning' });
  });

  it('withholds a dress whose status says it is out today', () => {
    const result = dressAvailability({
      status: 'rented',
      location: 'in_atelier',
      bookings: [],
      window: window('2026-11-10', '2026-11-10'),
      today,
    });
    expect(result).toMatchObject({ free: false, reason: 'state', kind: 'status', value: 'rented' });
  });

  it('withholds a dress that is reserved today even with no hold in the calendar', () => {
    const result = dressAvailability({
      status: 'reserved',
      location: 'in_atelier',
      bookings: [],
      window: window('2026-11-10', '2026-11-10'),
      today,
    });
    expect(result).toMatchObject({ free: false, reason: 'state', kind: 'status', value: 'reserved' });
  });

  it('ignores the current state for a window that has not started', () => {
    expect(
      dressAvailability({
        status: 'rented',
        location: 'cleaning',
        bookings: [],
        window: when,
        today,
      }),
    ).toEqual({ free: true });
  });

  it('still offers that dress for a future date', () => {
    expect(
      dressAvailability({
        status: 'available',
        location: 'cleaning',
        bookings: [],
        window: when,
        today,
      }),
    ).toEqual({ free: true });
  });

  it('withholds a dress that is with a customer and has no return date', () => {
    const booking: BlockingRange = {
      dressId: 'dress-1',
      from: day('2026-11-01'),
      to: null,
      kind: 'rented',
    };
    const result = dressAvailability({
      status: 'rented',
      location: 'with_customer',
      bookings: [booking],
      window: when,
      today,
    });
    expect(result).toMatchObject({ free: false, reason: 'booked' });
  });
});
