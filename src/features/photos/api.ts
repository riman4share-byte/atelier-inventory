import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { dressKeys } from '@/features/dresses/api';
import type { DressPhotoRow } from '@/features/dresses/api';
import { preparePhoto, photoPath } from './photoPipeline';

/**
 * Phase 4 data layer: signed display URLs, upload (resize → storage → row),
 * delete and reorder. All writes ride RLS as the signed-in staff member.
 */

/** Short-lived display URLs; refreshed by TanStack before they expire. */
export function useSignedPhotoUrls(photos: readonly DressPhotoRow[]): string[] {
  const signature = photos.map((photo) => photo.id).join(',');
  const query = useQuery({
    queryKey: ['photo-urls', signature],
    staleTime: 10 * 60_000, // URLs live 15 min; refresh well before
    queryFn: async (): Promise<string[]> => {
      const client = supabase as NonNullable<typeof supabase>;
      const urls: string[] = [];
      for (const photo of photos) {
        const { data, error } = await client.storage
          .from('dress-originals')
          .createSignedUrl(photo.original_path, 900);
        if (error) throw error;
        urls.push(data.signedUrl);
      }
      return urls;
    },
  });
  return query.data ?? [];
}

const PHOTO_ANGLE_VALUES = ['front', 'back', 'side', 'neckline', 'detail', 'other'] as const;
export type PhotoAngle = DressPhotoRow['angle']; // front | back | side | neckline | detail | other
export { PHOTO_ANGLE_VALUES };

/**
 * Signed display URLs for the first photo of each given dress (used by the
 * PDF catalog at export time). The first photo by sort order wins; never
 * throws for a dress with no photos — it just misses the map.
 */
export async function firstPhotoUrls(dresses: Array<{ id: string; code: string }>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (dresses.length === 0) return out;
  const client = supabase as NonNullable<typeof supabase>;
  const { data, error } = await client
    .from('dress_photos')
    .select('dress_id, original_path, sort_order')
    .in(
      'dress_id',
      dresses.map((dress) => dress.id),
    )
    .order('sort_order');
  if (error) throw error;
  const firstPath = new Map<string, string>();
  for (const row of data) {
    if (!firstPath.has(row.dress_id)) firstPath.set(row.dress_id, row.original_path);
  }
  for (const dress of dresses) {
    const path = firstPath.get(dress.id);
    if (!path) continue;
    const { data: signed, error: signError } = await client.storage
      .from('dress-originals')
      .createSignedUrl(path, 3600);
    if (signError) continue; // one bad file must not kill the export
    out[dress.code] = signed.signedUrl;
  }
  return out;
}

/** Upload many files in one tap; each becomes one dress_photos row. */
export function useAddPhotos(dressId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ files, angle }: { files: File[]; angle: PhotoAngle }): Promise<void> => {
      const db = supabase as NonNullable<typeof supabase>;
      const { data: existing, error: orderError } = await db
        .from('dress_photos')
        .select('sort_order')
        .eq('dress_id', dressId);
      if (orderError) throw orderError;
      let next = existing.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;

      for (const file of files) {
        const prepared = await preparePhoto(file);
        const rowId = crypto.randomUUID();
        const path = photoPath(dressId, rowId);
        const { error: uploadError } = await db.storage
          .from('dress-originals')
          .upload(path, prepared.blob, { contentType: 'image/jpeg', cacheControl: '3600' });
        if (uploadError) throw uploadError;
        const { error: insertError } = await db.from('dress_photos').insert({
          id: rowId,
          dress_id: dressId,
          angle,
          original_path: path,
          width: prepared.width,
          height: prepared.height,
          sort_order: next,
        });
        if (insertError) {
          // keep storage tidy if the row insert fails
          await db.storage.from('dress-originals').remove([path]);
          throw insertError;
        }
        next += 1;
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.photos(dressId) }),
  });
}

export function useDeletePhoto(dressId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (photo: DressPhotoRow) => {
      const db = supabase as NonNullable<typeof supabase>;
      const { error: deleteError } = await db.from('dress_photos').delete().eq('id', photo.id);
      if (deleteError) throw deleteError;
      const { error: storageError } = await db.storage
        .from('dress-originals')
        .remove([photo.original_path]);
      if (storageError) throw storageError;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.photos(dressId) }),
  });
}

/** Move one photo up/down in the ordered list by swapping sort_order. */
export function useMovePhoto(dressId: string, total: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: 'up' | 'down' }) => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= total) throw new Error('bad_move');
      const client0 = supabase as NonNullable<typeof supabase>;
      const rows = await client0
        .from('dress_photos')
        .select('id, sort_order')
        .eq('dress_id', dressId)
        .order('sort_order');
      if (rows.error) throw rows.error;
      const list = rows.data;
      const moving = list[index];
      const swapped = list[target];
      if (!moving || !swapped) throw new Error('bad_move');
      const { error: firstError } = await client0
        .from('dress_photos')
        .update({ sort_order: swapped.sort_order })
        .eq('id', moving.id);
      if (firstError) throw firstError;
      const { error: secondError } = await client0
        .from('dress_photos')
        .update({ sort_order: moving.sort_order })
        .eq('id', swapped.id);
      if (secondError) throw secondError;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.photos(dressId) }),
  });
}
