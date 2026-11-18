/**
 * PostgREST never returns more than 1000 rows in one request, whatever the
 * client asks for. A query that wants more silently gets 1000 and stops -
 * so a spreadsheet built from such a query would quietly lose everything
 * past the thousandth row.
 *
 * These helpers ask for the rows in pages instead, and refuse to pretend
 * that a truncated answer is a complete one.
 */

/** The hard cap the API enforces on every response. */
export const API_MAX_ROWS = 1000;

/** The shape of the response the Supabase client returns. */
export interface PageResponse<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Runs the same request again for each page until the API returns a short
 * page (which means there is nothing left).
 *
 * `request` gets the first and last row index of the page it should fetch.
 */
export async function fetchAllPages<T>(
  request: (from: number, to: number) => PromiseLike<PageResponse<T>>,
  options: { pageSize?: number; maxRows?: number } = {},
): Promise<T[]> {
  const pageSize = Math.max(1, Math.min(options.pageSize ?? API_MAX_ROWS, API_MAX_ROWS));
  const maxRows = options.maxRows ?? Number.POSITIVE_INFINITY;
  const rows: T[] = [];
  let from = 0;

  while (rows.length <= maxRows) {
    const { data, error } = await request(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  if (rows.length > maxRows) throw new Error('too_many_rows');
  return rows;
}
