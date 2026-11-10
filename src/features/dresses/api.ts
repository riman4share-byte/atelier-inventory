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
        .is('deleted_at', null)
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

// ---------------------------------------------------------------------------
// Phase 3: exports, table pagination and share links
// ---------------------------------------------------------------------------

/** Change the status of many dresses at once (table bulk bar). */
export function useBulkSetStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: DressRow['status'] }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { error } = await db.from('dresses').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.all }),
  });
}

export const EXPORT_ROW_LIMIT = 2000;

export interface ExportScopeSelection {
  search: string;
  status: DressRow['status'] | null;
  /** Specific ids (bulk selection); when set it replaces search/status. */
  ids?: string[];
}

/**
 * Every row matching the export scope, capped at EXPORT_ROW_LIMIT. Larger
 * exports need an Edge Function (recorded in GAPS.md, not built yet).
 */
export async function fetchDressesForExport(selection: ExportScopeSelection): Promise<DressRow[]> {
  const client = supabase as NonNullable<typeof supabase>;
  const built = buildDressFilters({
    search: selection.search,
    status: selection.status ?? 'all',
  });
  let builder = client
    .from('dresses')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (selection.ids) {
    builder = builder.in('id', selection.ids);
  } else {
    if (built.orExpression) builder = builder.or(built.orExpression);
    if (built.status) builder = builder.eq('status', built.status);
  }
  const { data, error } = await builder.limit(EXPORT_ROW_LIMIT + 1);
  if (error) throw error;
  if (data.length > EXPORT_ROW_LIMIT) {
    throw new Error('too_many_rows');
  }
  return data;
}

/** Server-paginated table rows with the material count per dress. */
export interface TableSort {
  column: 'code' | 'name_en' | 'status' | 'sale_price' | 'rent_price' | 'created_at';
  dir: 'asc' | 'desc';
}

export const TABLE_PAGE_SIZE = 20;

export function useDressesTable(filters: {
  search: string;
  status: StatusFilter;
  sort: TableSort;
  page: number;
}) {
  const built = buildDressFilters({ search: filters.search, status: filters.status });
  const from = filters.page * TABLE_PAGE_SIZE;
  return useQuery({
    queryKey: [
      ...dressKeys.lists(),
      'table',
      { search: filters.search, status: filters.status, sort: filters.sort, page: filters.page },
    ],
    queryFn: async () => {
      const client = supabase as NonNullable<typeof supabase>;
      let builder = client
        .from('dresses')
        .select('*, dress_materials(count)', { count: 'exact' })
        .is('deleted_at', null)
        .order(filters.sort.column, { ascending: filters.sort.dir === 'asc' })
        .range(from, from + TABLE_PAGE_SIZE - 1);
      if (built.orExpression) builder = builder.or(built.orExpression);
      if (built.status) builder = builder.eq('status', built.status);
      const { data, error, count } = await builder;
      if (error) throw error;
      return { rows: data, total: count ?? data.length };
    },
  });
}

// ---------------------------------------------------------------------------
// Share links
// ---------------------------------------------------------------------------

export type ShareLinkRow = Tables<'share_links'>;

/** 16 random bytes as hex — the token is the only key to a public page. */
export function newShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function shareLinkUrl(token: string, origin: string): string {
  return `${origin}/share/${token}`;
}

export function useCreateShareLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<'share_links'>): Promise<ShareLinkRow> => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data, error } = await db.from('share_links').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['share_links'] }),
  });
}

export function useShareLinks() {
  return useQuery({
    queryKey: ['share_links', 'recent'],
    queryFn: async (): Promise<ShareLinkRow[]> => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data, error } = await db
        .from('share_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

export function useRevokeShareLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { error } = await db.from('share_links').update({ revoked: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['share_links'] }),
  });
}

/** Public (signed-out) read of one token, through the definer function. */
export interface SharedDress {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  sale_price: number | null;
  rent_price: number | null;
}

export function useSharedDresses(token: string) {
  return useQuery({
    queryKey: ['share_links', 'public', token],
    staleTime: 0,
    retry: false,
    queryFn: async (): Promise<SharedDress[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client.rpc('get_shared_dresses', { p_token: token });
      if (error) throw error;
      return data;
    },
  });
}

