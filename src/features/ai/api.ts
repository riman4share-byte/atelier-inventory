import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DressRow } from '@/features/dresses/api';

export interface DressDraft {
  name_en: string;
  name_ar: string;
  silhouette: string;
  neckline: string;
  sleeves: string;
  fabrics: string[];
  color: string;
  description_en: string;
  description_ar: string;
  suggested_materials: string[];
  confidence: string;
}

export interface AiDescribeResult {
  draft: DressDraft;
  model: string;
  raw: unknown;
}

/** Call the ai-describe Edge Function for one dress. */
export function useDescribeDress() {
  return useMutation({
    mutationFn: async ({ dress }: { dress: DressRow }): Promise<AiDescribeResult> => {
      const client = supabase as NonNullable<typeof supabase>;

      // Fetch this dress's photos and build signed display URLs for the function.
      const { data: photos, error: photosError } = await client
        .from('dress_photos')
        .select('original_path, sort_order')
        .eq('dress_id', dress.id)
        .order('sort_order');
      if (photosError) throw photosError;
      const urls: string[] = [];
      for (const photo of photos ?? []) {
        const { data, error } = await client.storage
          .from('dress-originals')
          .createSignedUrl(photo.original_path, 600);
        if (!error && data) urls.push(data.signedUrl);
      }
      if (urls.length === 0) throw new Error('no_photos');

      // Existing names for dedup.
      const { data: existing, error: namesError } = await client
        .from('dresses')
        .select('name_en')
        .is('deleted_at', null)
        .limit(200);
      if (namesError) throw namesError;
      const existingNames = (existing ?? []).map((row) => row.name_en).filter(Boolean);

      const { data, error } = await client.functions.invoke('ai-describe', {
        body: { dressId: dress.id, imageUrls: urls, existingNames },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AiDescribeResult;
    },
  });
}

export function aiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'no_photos') return 'no_photos';
  if (message === 'no_key') return 'no_key';
  return 'unknown';
}
