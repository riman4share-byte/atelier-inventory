import { describe, expect, it } from 'vitest';
import { API_MAX_ROWS, fetchAllPages } from './pagedFetch';

/** A fake API that never returns more than `cap` rows, like PostgREST. */
function fakeApi(total: number, cap = API_MAX_ROWS) {
  const calls: Array<[number, number]> = [];
  const request = async (from: number, to: number) => {
    calls.push([from, to]);
    const start = Math.max(0, from);
    const end = Math.min(total, to + 1);
    const data = [];
    for (let i = start; i < end; i += 1) data.push({ id: i });
    return { data, error: null };
  };
  return { request, calls, cap };
}

describe('fetchAllPages', () => {
  it('returns everything when it fits in one page', async () => {
    const api = fakeApi(10);
    const rows = await fetchAllPages(api.request, { pageSize: 1000 });
    expect(rows).toHaveLength(10);
    expect(api.calls).toEqual([[0, 999]]);
  });

  it('keeps asking until the API returns a short page', async () => {
    const api = fakeApi(2500);
    const rows = await fetchAllPages(api.request);
    expect(rows).toHaveLength(2500);
    expect(rows[2499]).toEqual({ id: 2499 });
    expect(api.calls).toHaveLength(3);
  });

  it('never asks for more than the API allows in one request', async () => {
    const api = fakeApi(5000);
    await fetchAllPages(api.request, { pageSize: 5000 });
    for (const [from, to] of api.calls) {
      expect(to - from + 1).toBeLessThanOrEqual(API_MAX_ROWS);
    }
  });

  it('refuses to pretend a truncated answer is complete', async () => {
    const api = fakeApi(5000);
    await expect(fetchAllPages(api.request, { maxRows: 2000 })).rejects.toThrow('too_many_rows');
  });

  it('allows exactly the limit', async () => {
    const api = fakeApi(2000);
    const rows = await fetchAllPages(api.request, { maxRows: 2000 });
    expect(rows).toHaveLength(2000);
  });

  it('passes the API error on', async () => {
    await expect(
      fetchAllPages(async () => ({ data: null, error: { message: 'boom' } })),
    ).rejects.toThrow('boom');
  });
});
