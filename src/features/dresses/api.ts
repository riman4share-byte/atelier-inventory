import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildDressFilters, type StatusFilter } from './dressSearch';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';

export type DressRow = Tables<'dresses'>;
export type DressInsert = TablesInsert<'dresses'>;
export type DressUpdate = TablesUpdate<'dresses'>;
export type DressPhotoRow = Tables<'dress_photos'>;

const PAGE_SIZE = 12;

export const dressKeys = {
  all: ['dresses'] as const,
  lists: () => [...dressKeys.all, 'list'] as const,
  list: (search: string, status: StatusFilter) =>
    [...dressKeys.lists(), { search, status }] as const,
  counts: ['dresses', 'counts'] as const,
  detail: (id: string) => [...dressKeys.all, 'detail', id] as const,
  photos: (id: string) => [...dressKeys.all, 'photos', id] as const,
  suggestedCode: ['dresses', 'suggested-code'] as const,
};

/** Live counts for the hero banner. Five tiny count-only requests. */
export interface DressCounts {
  total: number;
  available: number;
  reserved: number;
  rented: number;
  sold: number;
}

export function useDressCounts() {
  return useQuery({
    queryKey: dressKeys.counts,
    queryFn: async (): Promise<DressCounts> => {
      const client = supabase as NonNullable<typeof supabase>;
      const countFor = async (status: DressRow['status'] | null) => {
        const base = client
          .from('dresses')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null);
        const { count, error } = await (status ? base.eq('status', status) : base);
        if (error) throw error;
        return count ?? 0;
      };
      const [total, available, reserved, rented, sold] = await Promise.all([
        countFor(null),
        countFor('available'),
        countFor('reserved'),
        countFor('rented'),
        countFor('sold'),
      ]);
      return { total, available, reserved, rented, sold };
    },
  });
}

/** Paged gallery list, newest first, filtered by search and status. */
export function useDresses(filters: { search: string; status: StatusFilter }) {
  const built = buildDressFilters(filters);
  return useInfiniteQuery({
    queryKey: dressKeys.list(filters.search, filters.status),
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const client = supabase as NonNullable<typeof supabase>;
      let builder = client
        .from('dresses')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (built.orExpression) builder = builder.or(built.orExpression);
      if (built.status) builder = builder.eq('status', built.status);
      const { data, error } = await builder.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });
}

/** One dress for the detail page. 'not_found' is a distinct result. */
export function useDress(id: string) {
  return useQuery({
    queryKey: dressKeys.detail(id),
    queryFn: async (): Promise<{ dress: DressRow; found: true } | { found: false }> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dresses')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? { dress: data, found: true } : { found: false };
    },
  });
}

/**
 * Photos for the viewer. Phase 4 fills this table; the viewer already supports
 * the photos once they exist.
 */
export function useDressPhotos(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: dressKeys.photos(id),
    enabled: options.enabled ?? true,
    queryFn: async (): Promise<DressPhotoRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dress_photos')
        .select('*')
        .eq('dress_id', id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

/** The next code suggestion (Phase 2 edition: no reservation is made). */
export function useSuggestedCode(enabled: boolean) {
  return useQuery({
    queryKey: dressKeys.suggestedCode,
    enabled,
    staleTime: 0,
    queryFn: async (): Promise<string | null> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client.rpc('suggest_dress_code');
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function dressErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  ) {
    return 'duplicate_code';
  }
  return 'unknown';
}

export function useCreateDress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: DressInsert): Promise<DressRow> => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data, error } = await db.from('dresses').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.all }),
  });
}

export function useUpdateDress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: DressUpdate }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { error } = await db.from('dresses').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.all }),
  });
}

/** Soft delete: deleted_at set, no row removed. Undo = clear deleted_at. */
export function useSoftDeleteDress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { error } = await db
        .from('dresses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.all }),
  });
}

export function useRestoreDress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { error } = await db.from('dresses').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.all }),
  });
}
