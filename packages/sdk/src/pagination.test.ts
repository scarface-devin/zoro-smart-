import { describe, it, expect } from 'vitest';
import { paginateAll, paginate } from '../src/pagination.js';

describe('paginateAll', () => {
  it('collects all pages into a flat array', async () => {
    const fetcher = async (cursor: string | undefined) => {
      if (cursor === undefined) return { records: [1, 2], nextCursor: 'p1' };
      if (cursor === 'p1') return { records: [3, 4], nextCursor: 'p2' };
      return { records: [5], nextCursor: undefined };
    };
    const out = await paginateAll(fetcher);
    expect(out).toEqual([1, 2, 3, 4, 5]);
  });

  it('respects the limit option', async () => {
    const fetcher = async (cursor: string | undefined) => {
      if (cursor === undefined) return { records: [1, 2, 3], nextCursor: 'p1' };
      return { records: [4, 5, 6], nextCursor: undefined };
    };
    const out = await paginateAll(fetcher, { limit: 4 });
    expect(out).toEqual([1, 2, 3, 4]);
  });

  it('stops on a stuck cursor (defensive)', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return calls > 2
        ? { records: [], nextCursor: undefined }
        : { records: [1], nextCursor: 'same' };
    };
    const out = await paginateAll(fetcher, { maxPages: 5 });
    expect(out).toEqual([1, 1]);
    expect(calls).toBeLessThanOrEqual(3);
  });

  it('terminates on empty page', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return calls === 1 ? { records: [1], nextCursor: 'p1' } : { records: [], nextCursor: 'p2' };
    };
    const out = await paginateAll(fetcher);
    expect(out).toEqual([1]);
  });
});

describe('paginate', () => {
  it('yields records one at a time', async () => {
    const fetcher = async (cursor: string | undefined) =>
      cursor
        ? { records: [3], nextCursor: undefined }
        : { records: [1, 2], nextCursor: 'p1' };
    const collected: number[] = [];
    for await (const r of paginate(fetcher)) collected.push(r);
    expect(collected).toEqual([1, 2, 3]);
  });

  it('respects the limit option across pages', async () => {
    const fetcher = async (cursor: string | undefined) =>
      cursor
        ? { records: [3, 4], nextCursor: undefined }
        : { records: [1, 2], nextCursor: 'p1' };
    const collected: number[] = [];
    for await (const r of paginate(fetcher, { limit: 3 })) collected.push(r);
    expect(collected).toEqual([1, 2, 3]);
  });
});
