import { useCallback, useEffect, useState } from 'react';
import { countBatches, subscribeToQueue } from './store';
import { isOnline, syncPendingBatches } from './sync';

/**
 * How many batches are waiting to upload. The count is polled as well as
 * pushed, so it stays right even if a write happened in another tab.
 */
export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    void countBatches().then(setCount);
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToQueue(refresh);
    const timer = window.setInterval(refresh, 5000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return count;
}

/**
 * The background worker. It drains the queue when the app starts, when the
 * device comes back online, and periodically while something is pending.
 */
export function useOfflineSync(): { pending: number; syncing: boolean; syncNow: () => void } {
  const pending = usePendingCount();
  const [syncing, setSyncing] = useState(false);

  const syncNow = useCallback(() => {
    if (syncing) return;
    setSyncing(true);
    void syncPendingBatches()
      .catch(() => undefined)
      .finally(() => setSyncing(false));
  }, [syncing]);

  useEffect(() => {
    // On start: try whatever is waiting.
    void syncPendingBatches().catch(() => undefined);

    const onOnline = () => void syncPendingBatches().catch(() => undefined);
    window.addEventListener('online', onOnline);

    // Every 20 seconds while something is pending.
    const timer = window.setInterval(() => {
      if (isOnline()) void syncPendingBatches().catch(() => undefined);
    }, 20_000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(timer);
    };
  }, []);

  return { pending, syncing, syncNow };
}
