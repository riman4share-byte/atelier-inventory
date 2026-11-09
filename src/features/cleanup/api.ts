import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DressPhotoRow } from '@/features/dresses/api';
import { dressKeys } from '@/features/dresses/api';
import { compositeCutout, base64ToBlob, type BackgroundChoice, type Enhancement } from './composite';

export interface CleanPhotoInput {
  photo: DressPhotoRow;
  background: BackgroundChoice;
  enhancement: Enhancement;
}

export function useCleanPhoto(dressId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ photo, background, enhancement }: CleanPhotoInput): Promise<void> => {
      const db = supabase as NonNullable<typeof supabase>;

      // 1. Get a signed URL for the original (the function fetches it).
      const { data: signed, error: signError } = await db.storage
        .from('dress-originals')
        .createSignedUrl(photo.original_path, 300);
      if (signError || !signed) throw signError ?? new Error('sign_failed');

      // 2. Call the bg-remove Edge Function.
      const { data: fnData, error: fnError } = await db.functions.invoke('bg-remove', {
        body: { imageUrl: signed.signedUrl },
      });
      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);

      // 3. Composite onto the chosen background.
      const cutout = base64ToBlob(fnData.cutout, fnData.mimeType ?? 'image/png');
      const composite = await compositeCutout(cutout, background, enhancement);

      // 4. Upload to dress-clean.
      const cleanPath = `${dressId}/${photo.id}.png`;
      const { error: uploadError } = await db.storage
        .from('dress-clean')
        .upload(cleanPath, composite.blob, { contentType: 'image/png', upsert: true });
      if (uploadError) throw uploadError;

      // 5. Update the row.
      const { error: updateError } = await db
        .from('dress_photos')
        .update({ clean_path: cleanPath, background_style: { background, enhancement } as never })
        .eq('id', photo.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.photos(dressId) }),
  });
}

export function useRevertClean(dressId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (photo: DressPhotoRow) => {
      const db = supabase as NonNullable<typeof supabase>;
      if (photo.clean_path) {
        await db.storage.from('dress-clean').remove([photo.clean_path]);
      }
      const { error } = await db
        .from('dress_photos')
        .update({ clean_path: null, background_style: null })
        .eq('id', photo.id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: dressKeys.photos(dressId) }),
  });
}

export function useCleanAll(dressId: string, photos: DressPhotoRow[]) {
  const clean = useCleanPhoto(dressId);
  return {
    ...clean,
    mutateAll: (background: BackgroundChoice, enhancement: Enhancement) => {
      for (const photo of photos) {
        if (photo.clean_path) continue; // skip already cleaned
        clean.mutate({ photo, background, enhancement });
      }
    },
  };
}
