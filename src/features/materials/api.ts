import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';

export type MaterialRow = Tables<'materials'>;
export type DressMaterialRow = Tables<'dress_materials'>;
export type StockMovementRow = Tables<'stock_movements'>;

export function useMaterials(search: string, category: string) {
  return useQuery({
    queryKey: ['materials', search, category],
    queryFn: async (): Promise<MaterialRow[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      let builder = client.from('materials').select('*').order('name_en');
      if (search.trim()) builder = builder.ilike('name_en', `%${search.trim()}%`);
      if (category && category !== 'all') builder = builder.eq('category', category as never);
      const { data, error } = await builder.limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: ['material', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<MaterialRow | null> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client.from('materials').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMaterial() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name_en: string; name_ar: string; category: string; unit?: string; stock_qty?: number; low_stock_threshold?: number }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data, error } = await db.from('materials').insert({
        name_en: values.name_en,
        name_ar: values.name_ar,
        category: values.category,
        unit: values.unit ?? 'piece',
        stock_qty: values.stock_qty ?? 0,
        low_stock_threshold: values.low_stock_threshold ?? 0,
        erp_sync_status: 'not_synced',
      } as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useUpdateMaterial() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<MaterialRow> }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { error } = await db.from('materials').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useAdjustStock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ materialId, delta, reason }: { materialId: string; delta: number; reason: 'purchase' | 'used' | 'adjustment' | 'return' }) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: session } = await db.auth.getSession();
      const { data: mat, error: readErr } = await db.from('materials').select('stock_qty').eq('id', materialId).single();
      if (readErr) throw readErr;
      const newQty = Number(mat.stock_qty) + delta;
      if (newQty < 0) throw new Error('negative_stock');
      const { error: updErr } = await db.from('materials').update({ stock_qty: newQty }).eq('id', materialId);
      if (updErr) throw updErr;
      const { error: movErr } = await db.from('stock_movements').insert({
        material_id: materialId,
        delta,
        reason,
        created_by: session?.session?.user?.id ?? null,
      });
      if (movErr) throw movErr;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useDressMaterials(dressId: string) {
  return useQuery({
    queryKey: ['dress_materials', dressId],
    queryFn: async (): Promise<(DressMaterialRow & { material: MaterialRow | null })[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dress_materials')
        .select('*, materials(*)')
        .eq('dress_id', dressId);
      if (error) throw error;
      return data.map((row) => ({ ...row, material: (row as { materials: MaterialRow | null }).materials ?? null }));
    },
  });
}

export function useSetDressMaterials() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ dressId, items }: { dressId: string; items: Array<{ material_id: string; quantity: number }> }) => {
      const db = supabase as NonNullable<typeof supabase>;
      await db.from('dress_materials').delete().eq('dress_id', dressId);
      if (items.length > 0) {
        const { error } = await db.from('dress_materials').insert(
          items.map((item) => ({ dress_id: dressId, material_id: item.material_id, quantity: item.quantity })),
        );
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => client.invalidateQueries({ queryKey: ['dress_materials', v.dressId] }),
  });
}
