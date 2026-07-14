/**
 * Cursor-based pagination helpers shared by Horizon REST endpoints and
 * contract list methods.
 *
 * The shape:
 *   - A `PageFetcher<T>` is a callback that takes the previous page's
 *     `nextCursor` (or `undefined` for the first page) and returns the
 *     next page: `{ records, nextCursor? }`.
 *   - `paginateAll` walks the full cursor chain and returns a flat array.
 *   - `paginate` exposes an async iterator for streaming UIs.
 *
 * Defensive bounds:
 *   - `maxPages` caps the loop (default 50) to avoid runaway fetches.
 *   - `limit` (where supported) stops once we have enough records.
 *   - If `nextCursor` doesn't change between pages we stop instead of
 *     spinning forever.
 */

export interface Page<T> {
  records: T[];
  nextCursor?: string;
}

export type PageFetcher<T> = (cursor: string | undefined) => Promise<Page<T>>;

export interface PaginateOptions {
  /** Hard cap on consecutive fetches. Default 50. */
  maxPages?: number;
  /** Stop once this many records have been collected. Default Infinity. */
  limit?: number;
}

/**
 * Walk a cursor-paginated endpoint until exhausted. Returns all records
 * as a flat array.
 *
 * Concurrency model: one fetcher in flight at a time. If your server
 * supports out-of-order cursors you can request multiple pages in parallel
 * yourself and then `paginateAll` over a pre-collected list.
 */
export async function paginateAll<T>(
  fetcher: PageFetcher<T>,
  opts: PaginateOptions = {},
): Promise<T[]> {
  const maxPages = opts.maxPages ?? 50;
  const out: T[] = [];
  let cursor: string | undefined = undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await fetcher(cursor);
    if (!page.records.length) break;
    out.push(...page.records);
    if (opts.limit !== undefined && out.length >= opts.limit) {
      if (out.length > opts.limit) out.length = opts.limit;
      break;
    }
    if (!page.nextCursor || page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  }
  return out;
}

/**
 * Async iterator over a cursor-paginated endpoint. Yields one record at a
 * time; backpressure is provided by the consumer's `for await` loop.
 */
export async function* paginate<T>(
  fetcher: PageFetcher<T>,
  opts: PaginateOptions = {},
): AsyncGenerator<T, void, void> {
  const maxPages = opts.maxPages ?? 50;
  let cursor: string | undefined = undefined;
  let produced = 0;
  for (let i = 0; i < maxPages; i++) {
    const page = await fetcher(cursor);
    if (!page.records.length) return;
    for (const r of page.records) {
      yield r;
      produced += 1;
      if (opts.limit !== undefined && produced >= opts.limit) return;
    }
    if (!page.nextCursor || page.nextCursor === cursor) return;
    cursor = page.nextCursor;
  }
}
