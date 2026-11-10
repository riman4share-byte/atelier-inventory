import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DressStatus, ListingType } from '@/lib/database.types';

/**
 * Phase 3 dashboard: one query for everything the home screen shows (counts,
 * attention list, recent additions, listed values). This loads all
 * non-deleted rows; at thousands of dresses the aggregates should move into
 * a database function or an Edge Function — recorded in GAPS.md.
 */
export interface DashboardRow {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  status: DressStatus;
  listing_type: ListingType;
  sale_price: number | null;
  rent_price: number | null;
  description_en: string | null;
  description_ar: string | null;
  photo_count: number;
  created_at: string;
}

export interface DashboardState {
  rows: DashboardRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * The dashboard query. It exposes the error state so a failed request is
 * never rendered as "no dresses yet" — a false statement about the business.
 */
export function useDashboardState(): DashboardState {
  const query = useQuery({
    queryKey: ['dashboard'],
    staleTime: 30_000,
    queryFn: async (): Promise<DashboardRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dresses')
        .select(
          'id, code, name_en, name_ar, status, listing_type, sale_price, rent_price, description_en, description_ar, created_at, dress_photos(count)',
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((row) => ({
        ...row,
        photo_count: row.dress_photos?.[0]?.count ?? 0,
      }));
    },
  });
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

/** @deprecated use useDashboardState() — this one hides the error state. */
export function useDashboard(): DashboardRow[] {
  return useDashboardState().rows;
}

export function countByStatus(rows: DashboardRow[]): Record<DressStatus, number> {
  const counts: Record<DressStatus, number> = {
    available: 0,
    reserved: 0,
    rented: 0,
    sold: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

/** Total sale prices of dresses that are still listed for sale. */
export function listedSaleValue(rows: DashboardRow[]): number {
  return sumWhere(rows, (row) => row.listing_type !== 'rent' && row.status !== 'sold', 'sale_price');
}

/** Total per-day rent prices of dresses that are listed for rent. */
export function listedRentValue(rows: DashboardRow[]): number {
  return sumWhere(rows, (row) => row.listing_type !== 'sale' && row.status !== 'sold', 'rent_price');
}

function sumWhere(
  rows: DashboardRow[],
  keep: (row: DashboardRow) => boolean,
  field: 'sale_price' | 'rent_price',
): number {
  return rows
    .filter(keep)
    .reduce((total, row) => total + (row[field] ?? 0), 0);
}

export interface AttentionItem {
  kind: 'description' | 'price' | 'photos';
  code: string;
  name: string;
}

/** Dresses missing a description, a price or any photo, worst-case listed last. */
export function needsAttention(rows: DashboardRow[], language: string): AttentionItem[] {
  const isArabic = language.startsWith('ar');
  const items: AttentionItem[] = [];
  for (const row of rows) {
    const name =
      (isArabic ? row.name_ar : row.name_en) ||
      (isArabic ? row.name_en : row.name_ar) ||
      row.code;
    if (!row.description_en && !row.description_ar) {
      items.push({ kind: 'description', code: row.code, name });
      continue;
    }
    if (row.sale_price === null && row.rent_price === null) {
      items.push({ kind: 'price', code: row.code, name });
      continue;
    }
    if (row.photo_count === 0) {
      items.push({ kind: 'photos', code: row.code, name });
    }
  }
  const weight: Record<AttentionItem['kind'], number> = {
    description: 0,
    price: 1,
    photos: 2,
  };
  return items.sort((left, right) => weight[left.kind] - weight[right.kind]).slice(0, 10);
}
