import { allBatches, deleteBatch, notifyQueueChanged, putBatch } from './store';
import type { QueuedBatch, QueuedPhoto } from './store';
import { isOnline, uploadBatch } from './sync';

/**
 * Saves a capture.
 *
 * The order matters: the batch is written to disk **before** the network is
 * touched. If the connection drops mid-upload, or the tab is closed, the
 * photos are still on the device and go up later. Nothing is ever held only
 * in memory.
 */
export async function saveCaptureBatch(photos: QueuedPhoto[]): Promise<{
  queued: boolean;
  dressId: string | null;
  error: string | null;
}> {
  if (photos.length === 0) return { queued: false, dressId: null, error: 'nothing to save' };

  const batch: QueuedBatch = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    dressId: null,
    attempts: 0,
    status: 'pending',
    error: null,
    photos,
  };

  const stored = await putBatch(batch);
  if (!stored) {
    // No IndexedDB on this device. Fall back to a straight upload so the
    // capture still works while there is a connection.
    try {
      const { dressId } = await uploadBatch(batch);
      return { queued: false, dressId, error: null };
    } catch (error) {
      return {
        queued: false,
        dressId: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  try {
    // When the device already knows it is offline, do not wait for a request
    // to time out: queue it and tell the user straight away.
    if (!isOnline()) {
      await putBatch({ ...batch, attempts: 1, status: 'failed', error: 'offline' });
      notifyQueueChanged();
      return { queued: true, dressId: null, error: 'offline' };
    }
    const { dressId } = await uploadBatch(batch);
    await deleteBatch(batch.id);
    notifyQueueChanged();
    return { queued: false, dressId, error: null };
  } catch (error) {
    await putBatch({
      ...batch,
      attempts: 1,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
    notifyQueueChanged();
    return {
      queued: true,
      dressId: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** How many batches are waiting, and how many photos in total. */
export async function queueSummary(): Promise<{ batches: number; photos: number }> {
  const batches = await allBatches();
  return {
    batches: batches.length,
    photos: batches.reduce((total, batch) => total + batch.photos.length, 0),
  };
}
