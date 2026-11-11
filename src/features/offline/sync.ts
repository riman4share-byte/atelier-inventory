import { supabase } from '@/lib/supabase';
import { allBatches, deleteBatch, notifyQueueChanged, putBatch } from './store';
import type { QueuedBatch } from './store';

/**
 * Uploads a queued batch.
 *
 * The dress row is created first and its id is written back onto the batch,
 * so a retry after a half-finished upload reuses the same dress instead of
 * creating a second one.
 */
export async function uploadBatch(batch: QueuedBatch): Promise<{ dressId: string }> {
  const db = supabase as NonNullable<typeof supabase>;

  let dressId = batch.dressId;
  if (!dressId) {
    const { data: dress, error: createError } = await db
      .from('dresses')
      // name_en stays empty so the detail page's auto-describe trigger fires.
      .insert({ code: null as never, name_en: '', listing_type: 'both', status: 'available' })
      .select('id')
      .single();
    if (createError) throw createError;
    dressId = dress.id;
    await putBatch({ ...batch, dressId });
  }

  for (const photo of batch.photos) {
    const path = `${dressId}/${photo.id}.jpg`;
    const { error: uploadError } = await db.storage
      .from('dress-originals')
      .upload(path, photo.blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    const { error: rowError } = await db.from('dress_photos').insert({
      id: photo.id,
      dress_id: dressId,
      angle: photo.angle,
      original_path: path,
      width: photo.width,
      height: photo.height,
      sort_order: 0,
    });
    if (rowError) throw rowError;
  }

  return { dressId };
}

/**
 * Drains the queue. Safe to call often: it does nothing when there is nothing
 * pending, and it stops at the first failure so a broken connection does not
 * hammer the server.
 */
export async function syncPendingBatches(): Promise<{ synced: number; failed: number; dressIds: string[] }> {
  const batches = await allBatches();
  let synced = 0;
  let failed = 0;
  const dressIds: string[] = [];

  for (const batch of batches) {
    if (batch.status === 'failed' && batch.attempts > 5) continue; // give up for now
    try {
      const { dressId } = await uploadBatch(batch);
      await deleteBatch(batch.id);
      dressIds.push(dressId);
      synced += 1;
    } catch (error) {
      failed += 1;
      await putBatch({
        ...batch,
        attempts: batch.attempts + 1,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      // The connection is probably down; there is no point trying the next one.
      break;
    }
  }

  if (synced > 0 || failed > 0) notifyQueueChanged();
  return { synced, failed, dressIds };
}

/** Is the device able to reach the internet right now? */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}
