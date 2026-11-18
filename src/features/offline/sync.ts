import { supabase } from '@/lib/supabase';
import { allBatches, deleteBatch, notifyQueueChanged, putBatch } from './store';
import type { QueuedBatch } from './store';

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const FAILED_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Uploads a queued batch.
 *
 * The dress row is created first and its id is written back onto the batch,
 * so a retry after a half-finished upload reuses the same dress instead of
 * creating a second one. Storage uploads use upsert so a retry after a
 * partial failure does not hit "already exists".
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

  let photoIndex = 0;
  for (const photo of batch.photos) {
    const path = `${dressId}/${photo.id}.jpg`;
    const { error: uploadError } = await db.storage
      .from('dress-originals')
      .upload(path, photo.blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: true });
    if (uploadError) throw uploadError;

    const { error: rowError } = await db.from('dress_photos').insert({
      id: photo.id,
      dress_id: dressId,
      angle: photo.angle,
      original_path: path,
      width: photo.width,
      height: photo.height,
      sort_order: photoIndex++,
    });
    if (rowError) throw rowError;
  }

  return { dressId };
}

/**
 * Drains the queue. Safe to call often: it does nothing when there is nothing
 * pending, and it stops at the first failure so a broken connection does not
 * hammer the server.
 *
 * A batch marked "processing" by another tab is skipped unless its claim is
 * stale (older than 5 minutes), so two tabs cannot both create the same dress.
 * A batch that failed more than an hour ago is retried, so a temporary
 * failure does not block the queue forever.
 */
export async function syncPendingBatches(): Promise<{ synced: number; failed: number; dressIds: string[] }> {
  const batches = await allBatches();
  let synced = 0;
  let failed = 0;
  const dressIds: string[] = [];
  const now = Date.now();

  for (const batch of batches) {
    // Skip batches another tab is actively processing (unless stale).
    if (batch.status === 'processing') {
      const started = batch.processingStartedAt ?? 0;
      if (now - started < PROCESSING_TIMEOUT_MS) continue;
    }
    // Retry failed batches after a cooldown.
    if (batch.status === 'failed' && batch.attempts > 5) {
      const age = now - (batch.createdAt ?? 0);
      if (age < FAILED_COOLDOWN_MS) continue;
      // Reset the attempt counter so it gets a fresh run.
      await putBatch({ ...batch, attempts: 0, status: 'pending', error: null });
      batch.attempts = 0;
      batch.status = 'pending';
    }

    if (batch.status === 'failed') continue;

    // Claim the batch so another tab skips it.
    await putBatch({ ...batch, status: 'processing', processingStartedAt: now });

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
        processingStartedAt: null,
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
