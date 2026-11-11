import { describe, expect, it } from 'vitest';
import { allBatches, countBatches, deleteBatch, putBatch, subscribeToQueue, notifyQueueChanged } from './store';

/**
 * The queue has to be invisible to the rest of the app when the browser will
 * not give it IndexedDB — private browsing, a locked profile, an old WebView.
 * Everything must resolve rather than throw, and the capture screen must
 * simply fall back to uploading straight away.
 */
describe('the offline queue store', () => {
  it('degrades quietly when IndexedDB is unavailable', async () => {
    // jsdom has no IndexedDB, which is the same situation as a browser that
    // refuses to give the app one.
    expect(typeof indexedDB).toBe('undefined');

    await expect(putBatch({
      id: 'a', createdAt: 0, dressId: null, attempts: 0, status: 'pending', error: null, photos: [],
    })).resolves.toBe(false);
    await expect(allBatches()).resolves.toEqual([]);
    await expect(countBatches()).resolves.toBe(0);
    await expect(deleteBatch('a')).resolves.toBeUndefined();
  });

  it('notifies subscribers and lets them unsubscribe', () => {
    let calls = 0;
    const unsubscribe = subscribeToQueue(() => {
      calls += 1;
    });

    notifyQueueChanged();
    notifyQueueChanged();
    expect(calls).toBe(2);

    unsubscribe();
    notifyQueueChanged();
    expect(calls).toBe(2);
  });

  it('does not let a broken subscriber break the queue', () => {
    const unsubscribe = subscribeToQueue(() => {
      throw new Error('subscriber exploded');
    });
    expect(() => notifyQueueChanged()).not.toThrow();
    unsubscribe();
  });
});
