import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';

export type CustomerRow = Tables<'customers'>;
export type DressMovementRow = Tables<'dress_movements'>;
export type DressReservationRow = Tables<'dress_reservations'>;
export type DressLocation = Tables<'dresses'>['location'];
import { dressKeys } from '@/features/dresses/api';

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
      const { data, error } = await builder.limit(500);
      if (error) throw error;
      return data;
    },
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
    }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: session } = await db.auth.getSession();
      const { error } = await db.from('dress_movements').insert({
        ...values,
        performed_by: session?.session?.user?.id ?? null,
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
      const weekEnd = new Date(now.getTime() + 7 * 24 * 3600_000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [_outRes, overdueRes, dueRes, reservedRes] = await Promise.all([
        client.from('dress_movements').select('id', { count: 'exact', head: true }).eq('direction', 'out')
          .is('corrects_movement_id', null),
        client.from('dress_movements').select('id', { count: 'exact', head: true }).eq('direction', 'out')
          .lt('due_at', now.toISOString()).not('due_at', 'is', null),
        client.from('dress_movements').select('id', { count: 'exact', head: true }).eq('direction', 'out')
          .gte('due_at', now.toISOString()).lte('due_at', weekEnd),
        client.from('dress_reservations').select('id', { count: 'exact', head: true })
          .eq('status', 'active').gte('from_date', monthStart.slice(0, 10)),
      ]);

      // "out now" = dresses whose location is with_customer
      const { count: outNow } = await client
        .from('dresses').select('id', { count: 'exact', head: true })
        .eq('location', 'with_customer').is('deleted_at', null);

      return {
        outNow: outNow ?? 0,
        overdue: overdueRes.count ?? 0,
        dueThisWeek: dueRes.count ?? 0,
        reservedThisMonth: reservedRes.count ?? 0,
      };
    },
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
