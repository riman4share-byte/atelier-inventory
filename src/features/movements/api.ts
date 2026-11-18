import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';

export type CustomerRow = Tables<'customers'>;
export type DressMovementRow = Tables<'dress_movements'>;
export type DressReservationRow = Tables<'dress_reservations'>;
export type DressLocation = Tables<'dresses'>['location'];
import { dressKeys } from '@/features/dresses/api';
import type { DressRow } from '@/features/dresses/api';

// ---- Customers -----------------------------------------------------------

export function useCustomers(search: string) {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async (): Promise<CustomerRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      let builder = client.from('customers').select('*').is('deleted_at', null).order('full_name');
      if (search.trim()) {
        builder = builder.ilike('full_name', `%${search.trim()}%`);
      }
      const { data, error } = await builder.limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCustomer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: { full_name: string; phone?: string | null; whatsapp?: string | null; email?: string | null; notes?: string | null }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data, error } = await db.from('customers').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ---- Movements -----------------------------------------------------------

export function useDressMovements(dressId: string) {
  return useQuery({
    queryKey: ['movements', dressId],
    queryFn: async (): Promise<DressMovementRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dress_movements')
        .select('*')
        .eq('dress_id', dressId)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllMovements(filters: { from?: string; to?: string; dressId?: string; customerId?: string }) {
  return useQuery({
    queryKey: ['movements', 'all', filters],
    queryFn: async (): Promise<DressMovementRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      let builder = client.from('dress_movements').select('*').order('occurred_at', { ascending: false });
      if (filters.from) builder = builder.gte('occurred_at', filters.from);
      if (filters.to) builder = builder.lte('occurred_at', filters.to);
      if (filters.dressId) builder = builder.eq('dress_id', filters.dressId);
      if (filters.customerId) builder = builder.eq('customer_id', filters.customerId);
      const { data, error } = await builder.limit(5000);
      if (error) throw error;
      return data;
    },
  });
}

export function useMovementNames(movements: DressMovementRow[]) {
  return useQuery({
    queryKey: ['movements', 'names', movements.length],
    queryFn: async (): Promise<{
      dresses: Record<string, string>;
      customers: Record<string, string>;
    }> => {
      const client = supabase as NonNullable<typeof supabase>;
      const dressIds = [...new Set(movements.map((m) => m.dress_id))];
      const customerIds = [...new Set(movements.map((m) => m.customer_id).filter(Boolean))] as string[];

      const dresses: Record<string, string> = {};
      const customers: Record<string, string> = {};

      // The names are looked up so the sheet can say "RF-0001 Seraphine"
      // instead of a UUID. A history nobody can read is not a record.
      if (dressIds.length > 0) {
        const { data } = await client
          .from('dresses')
          .select('id, code, name_en')
          .in('id', dressIds);
        for (const dress of data ?? []) {
          dresses[dress.id] = dress.name_en
            ? `${dress.code} ${dress.name_en}`
            : dress.code;
        }
      }

      if (customerIds.length > 0) {
        const { data } = await client
          .from('customers')
          .select('id, full_name')
          .in('id', customerIds);
        for (const customer of data ?? []) {
          customers[customer.id] = customer.full_name;
        }
      }

      return { dresses, customers };
    },
    // The names only change when a dress or a customer does.
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMovement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      dress_id: string;
      direction: 'out' | 'in';
      reason: 'rental' | 'sale_delivery' | 'fitting' | 'alteration' | 'cleaning' | 'photoshoot' | 'return' | 'other';
      customer_id?: string | null;
      from_location?: string | null;
      to_location: string;
      occurred_at?: string;
      due_at?: string | null;
      deposit_amount?: number | null;
      condition_notes?: string | null;
      condition_photo_paths?: string[];
      corrects_movement_id?: string | null;
    }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: session } = await db.auth.getSession();
      const { error } = await db.from('dress_movements').insert({
        ...values,
        performed_by: session?.session?.user?.id ?? undefined,
        source: 'app',
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['movements', variables.dress_id] });
      client.invalidateQueries({ queryKey: dressKeys.all });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Transactional movement functions -------------------------------------
//
// These wrap a single database function that locks the dress, validates
// availability, writes the ledger entry and updates the dress atomically.
// Use them instead of useCreateMovement / useCreateReservation for check-out,
// check-in and reserve, so a second tablet cannot race past the checks.

export function useCheckOutDress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      dress_id: string;
      customer_id: string;
      reason: 'rental' | 'sale_delivery' | 'fitting' | 'alteration' | 'cleaning' | 'photoshoot' | 'other';
      to_location: string;
      occurred_at?: string;
      due_at?: string | null;
      deposit_amount?: number | null;
      condition_notes?: string | null;
    }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: session } = await db.auth.getSession();
      const { data, error } = await db.rpc('check_out_dress', {
        p_dress_id: values.dress_id,
        p_customer_id: values.customer_id,
        p_reason: values.reason,
        p_to_location: values.to_location,
        p_occurred_at: values.occurred_at ?? undefined,
        p_due_at: values.due_at ?? undefined,
        p_deposit_amount: values.deposit_amount ?? undefined,
        p_condition_notes: values.condition_notes ?? undefined,
        p_performed_by: session?.session?.user?.id ?? undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['movements', variables.dress_id] });
      client.invalidateQueries({ queryKey: dressKeys.all });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useCheckInDress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      dress_id: string;
      to_location: string;
      occurred_at?: string;
      condition_notes?: string | null;
      deposit_returned?: boolean;
    }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: session } = await db.auth.getSession();
      const { data, error } = await db.rpc('check_in_dress', {
        p_dress_id: values.dress_id,
        p_to_location: values.to_location,
        p_occurred_at: values.occurred_at ?? undefined,
        p_condition_notes: values.condition_notes ?? undefined,
        p_deposit_returned: values.deposit_returned ?? false,
        p_performed_by: session?.session?.user?.id ?? undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['movements', variables.dress_id] });
      client.invalidateQueries({ queryKey: dressKeys.all });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useReserveDress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      dress_id: string;
      customer_id: string | null;
      from_date: string;
      to_date: string;
      event_date?: string | null;
      notes?: string | null;
    }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: session } = await db.auth.getSession();
      const { data, error } = await db.rpc('reserve_dress', {
        p_dress_id: values.dress_id,
        p_customer_id: values.customer_id ?? undefined,
        p_from_date: values.from_date,
        p_to_date: values.to_date,
        p_event_date: values.event_date ?? undefined,
        p_notes: values.notes ?? undefined,
        p_performed_by: session?.session?.user?.id ?? undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['reservations', variables.dress_id] });
      client.invalidateQueries({ queryKey: dressKeys.all });
      client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useCancelReservationRpc() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: session } = await db.auth.getSession();
      const { error } = await db.rpc('cancel_reservation', {
        p_reservation_id: id,
        p_performed_by: session?.session?.user?.id ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['reservations'] });
      client.invalidateQueries({ queryKey: dressKeys.all });
      client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

// ---- Reservations ---------------------------------------------------------

export function useDressReservations(dressId: string) {
  return useQuery({
    queryKey: ['reservations', dressId],
    queryFn: async (): Promise<DressReservationRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dress_reservations')
        .select('*')
        .eq('dress_id', dressId)
        .order('from_date');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReservation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      dress_id: string;
      customer_id?: string | null;
      from_date: string;
      to_date: string;
      event_date?: string | null;
      notes?: string | null;
    }) => {
      const db = supabase as NonNullable<typeof supabase>;
      // Conflict check: any active reservation overlapping the range.
      const { data: conflicts, error: conflictError } = await db
        .from('dress_reservations')
        .select('id')
        .eq('dress_id', values.dress_id)
        .eq('status', 'active')
        .lte('from_date', values.to_date)
        .gte('to_date', values.from_date);
      if (conflictError) throw conflictError;
      if (conflicts && conflicts.length > 0) throw new Error('conflict');
      const { error } = await db.from('dress_reservations').insert(values);
      // The database also refuses an overlap (exclusion constraint), which
      // catches the case where two tablets pass the check above at the same
      // moment. Report it the same way as the check, not as a raw database
      // error.
      if (error) {
        if (error.code === '23P01' || error.message.includes('dress_reservations_no_overlap')) {
          throw new Error('conflict');
        }
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['reservations', variables.dress_id] });
    },
  });
}

export function useCancelReservation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { error } = await db.from('dress_reservations').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

// ---- Summary for dashboard -----------------------------------------------

export function useMovementSummary() {
  return useQuery({
    queryKey: ['movements', 'summary'],
    queryFn: async () => {
      const client = supabase as NonNullable<typeof supabase>;
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 3600_000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Only movements that are still open (no closing "in") count as overdue
      // or due this week. A dress returned early must not look overdue forever.
      const { data: movements, error: movementError } = await client
        .from('dress_movements')
        .select('dress_id, direction, occurred_at, due_at, corrects_movement_id')
        .limit(5000);
      if (movementError) throw movementError;

      const live = (movements ?? []).filter((m) => !m.corrects_movement_id);
      const outMovements = live.filter((m) => m.direction === 'out');
      const inMovements = live.filter((m) => m.direction === 'in');

      const overdueDresses = new Set<string>();
      const dueThisWeekDresses = new Set<string>();
      for (const out of outMovements) {
        const hasClosingIn = inMovements.some(
          (inp) => inp.dress_id === out.dress_id && new Date(inp.occurred_at) > new Date(out.occurred_at),
        );
        if (hasClosingIn) continue;
        if (!out.due_at) continue;
        const due = new Date(out.due_at);
        if (due < now) overdueDresses.add(out.dress_id);
        else if (due <= weekEnd) dueThisWeekDresses.add(out.dress_id);
      }

      const { count: reservedThisMonth } = await client
        .from('dress_reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('from_date', monthStart.toISOString().slice(0, 10));

      // "out now" = dresses whose location is with_customer
      const { count: outNow } = await client
        .from('dresses')
        .select('id', { count: 'exact', head: true })
        .eq('location', 'with_customer')
        .is('deleted_at', null);

      return {
        outNow: outNow ?? 0,
        overdue: overdueDresses.size,
        dueThisWeek: dueThisWeekDresses.size,
        reservedThisMonth: reservedThisMonth ?? 0,
      };
    },
  });
}

export function useTurnoverDays() {
  return useQuery({
    queryKey: ['app_settings', 'turnover_days'],
    queryFn: async (): Promise<number> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('app_settings')
        .select('turnover_days')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data?.turnover_days ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomerMovements(customerId: string) {
  return useQuery({
    queryKey: ['movements', 'customer', customerId],
    queryFn: async (): Promise<DressMovementRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dress_movements')
        .select('*')
        .eq('customer_id', customerId)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ---- Availability by date -------------------------------------------------
//
// Three reads answer "which dresses are free on the 20th": the inventory, the
// outgoing movements that could still be running when the window opens, and
// the active holds. The closing returns are fetched separately so a rental
// that came back early frees the dress before its due date.

/** The columns the availability screen needs — not the whole dress. */
export type AvailabilityDress = Pick<
  DressRow,
  'id' | 'code' | 'name_en' | 'name_ar' | 'category' | 'status' | 'location'
>;

export const availabilityKeys = {
  dresses: ['availability', 'dresses'] as const,
  window: (from: string, to: string) => ['availability', 'window', from, to] as const,
};

export function useAvailabilityDresses() {
  return useQuery({
    queryKey: availabilityKeys.dresses,
    queryFn: async (): Promise<AvailabilityDress[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dresses')
        .select('id, code, name_en, name_ar, category, status, location')
        .is('deleted_at', null)
        .order('code')
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Every movement that can hold a dress during the window.
 *
 * The window is a pair of YYYY-MM-DD days, both inclusive. Outgoing movements
 * with no due date are included because they block every future date.
 */
export function useAvailabilityMovements(window: { from: string; to: string }) {
  return useQuery({
    queryKey: availabilityKeys.window(window.from, window.to),
    queryFn: async (): Promise<DressMovementRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      // The query bounds are padded by a day at each end and the exact test is
      // done in local time afterwards. A due timestamp of 22:00Z is 01:00 the
      // next morning in the atelier, and a filter on the UTC day would drop a
      // dress that is still out for part of the day being asked about.
      const pad = 24 * 3600_000;
      const firstDay = new Date(
        new Date(`${window.from}T00:00:00.000Z`).getTime() - pad,
      ).toISOString();
      const lastDay = new Date(
        new Date(`${window.to}T23:59:59.999Z`).getTime() + pad,
      ).toISOString();

      const { data: outgoing, error } = await client
        .from('dress_movements')
        .select('*')
        .eq('direction', 'out')
        .lte('occurred_at', lastDay)
        // A movement that ended before the window opens cannot block it.
        .or(`due_at.is.null,due_at.gte.${firstDay}`);
      if (error) throw error;
      if (!outgoing || outgoing.length === 0) return [];

      const dressIds = [...new Set(outgoing.map((movement) => movement.dress_id))];
      const earliest = outgoing.reduce(
        (min, movement) => (movement.occurred_at < min ? movement.occurred_at : min),
        outgoing[0]!.occurred_at,
      );
      const { data: incoming, error: incomingError } = await client
        .from('dress_movements')
        .select('*')
        .eq('direction', 'in')
        .in('dress_id', dressIds)
        .gte('occurred_at', earliest);
      if (incomingError) throw incomingError;

      return [...outgoing, ...(incoming ?? [])];
    },
  });
}

/** Active holds that touch the window. */
export function useAvailabilityReservations(window: { from: string; to: string }) {
  return useQuery({
    queryKey: [...availabilityKeys.window(window.from, window.to), 'reservations'],
    queryFn: async (): Promise<DressReservationRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dress_reservations')
        .select('*')
        .eq('status', 'active')
        .lte('from_date', window.to)
        .gte('to_date', window.from)
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });
}
