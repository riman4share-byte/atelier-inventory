import type { PhotoAngle } from '@/features/photos/api';

/**
 * The offline queue.
 *
 * Photos taken in the atelier back room — where there is no signal — must not
 * be lost. When a save cannot reach the server, the whole batch (the prepared
 * JPEG blobs, already resized and stripped of their location data) is written
 * to IndexedDB and uploaded later.
 *
 * The prepared blobs are what get stored, not the originals: resizing is the
 * slow part, so doing it once and keeping the result is both faster and
 * smaller on disk.
 */

export interface QueuedPhoto {
  id: string;
  angle: PhotoAngle;
  blob: Blob;
  width: number;
  height: number;
}

export interface QueuedBatch {
  id: string;
  createdAt: number;
  /** The dress row, once it has been created. Reused on a retry. */
  dressId: string | null;
  attempts: number;
  status: 'pending' | 'failed';
  error: string | null;
  photos: QueuedPhoto[];
}

const DB_NAME = 'atelier-offline';
const DB_VERSION = 1;
const STORE = 'batches';

/** Not every browser gives a tab IndexedDB (private mode, locked storage). */
let unavailable = false;

function openDb(): Promise<IDBDatabase | null> {
  if (unavailable) return Promise.resolve(null);
  if (typeof indexedDB === 'undefined') {
    unavailable = true;
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      unavailable = true;
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      unavailable = true;
      resolve(null);
    };
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function putBatch(batch: QueuedBatch): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const store = tx(db, 'readwrite');
      const request = store.put(batch);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function allBatches(): Promise<QueuedBatch[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const request = tx(db, 'readonly').getAll();
      request.onsuccess = () => resolve((request.result ?? []) as QueuedBatch[]);
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function deleteBatch(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const request = tx(db, 'readwrite').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function countBatches(): Promise<number> {
  const db = await openDb();
  if (!db) return 0;
  return new Promise((resolve) => {
    try {
      const request = tx(db, 'readonly').count();
      request.onsuccess = () => resolve(request.result ?? 0);
      request.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

// --- change notification -----------------------------------------------------

const listeners = new Set<() => void>();

/** Tell the app the queue changed, so the badge and the worker react. */
export function notifyQueueChanged(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A broken subscriber must not break the queue.
    }
  }
}

export function subscribeToQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
