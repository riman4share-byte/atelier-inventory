import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DressRow } from '@/features/dresses/api';

export interface DressDraft {
  name_en: string;
  name_ar: string;
  garment_type: string;
  silhouette: string;
  neckline: string;
  sleeves: string;
  fabrics: string[];
  color: string;
  embellishment: string;
  hem_train: string;
  back_closure: string;
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

/**
 * The photograph was refused: it is not a garment.
 *
 * The Edge Function asks a small model this question first, so a photo of a
 * room or a face never costs a full description.
 */
export interface AiRejection {
  rejected: true;
  subject: string;
  reason: string;
  model: string;
}

/** Call the ai-describe Edge Function for one dress. */
export function useDescribeDress() {
  return useMutation({
    mutationFn: async ({ dress }: { dress: DressRow }): Promise<AiDescribeResult | AiRejection> => {
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
      // A refusal is a valid answer, not a failure.
      if (data?.rejected) {
        return {
          rejected: true,
          subject: typeof data.subject === 'string' ? data.subject : '',
          reason: typeof data.reason === 'string' ? data.reason : '',
          model: typeof data.model === 'string' ? data.model : '',
        };
      }
      // A 200 with no usable body is a failure, not a draft: without this
      // guard the caller would read `.draft` off undefined and crash the page.
      if (!data || typeof data !== 'object' || !('draft' in data)) {
        throw new Error('bad_response');
      }
      return data as AiDescribeResult;
    },
  });
}

/**
 * Turn a failure into a code the UI can translate.
 *
 * The Edge Function answers with `{ error: 'no_key' | 'no_images' | ... }`.
 * For a non-2xx status supabase-js puts the raw response in `context`, so the
 * specific code is read from there; the message is only a fallback.
 */
export function aiErrorMessage(error: unknown): string {
  const context = (error as { context?: { body?: unknown } } | null)?.context;
  const raw = context?.body;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as { error?: unknown };
      if (typeof parsed.error === 'string') return parsed.error;
    } catch {
      // not JSON, fall through to the message
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'no_photos') return 'no_photos';
  if (message === 'no_key') return 'no_key';
  return 'unknown';
}
