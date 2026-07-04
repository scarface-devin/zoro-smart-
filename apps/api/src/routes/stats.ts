import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { StatsResponse, StatsTimeseriesResponse } from '@solshare/shared';
import { cache } from '../lib/cache.js';

const timeseriesQuery = z.object({
  months: z.coerce.number().int().min(1).max(36).default(12),
});

interface ProtocolSnapshotRow {
  timestamp: number | Date;
  capacity_w: number;
  shares_outstanding: string;
  yield_claimed: string;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get('/stats', async () => {
    const cached = await cache.get<StatsResponse>('stats:global');
    if (cached) return cached;
    // In production: sum from DB rows.
    const resp: StatsResponse = {
      totalArrays: 0,
      activeArrays: 0,
      totalCapacityW: 0,
      totalSharesOutstanding: '0',
      totalYieldClaimed: '0',
      totalBridgedVolume: '0',
    };
    await cache.set('stats:global', resp, 30);
    return resp;
  });

  /**
   * Time-series of protocol-wide stats. Backed by the `protocol_snapshots`
   * table that the indexer writes to on every cron tick.
   *
   * Scaffold behaviour: returns `{ points: [], ready: false, months }`
   * until the indexer has accumulated enough history. The dashboard
   * treats that as a "waiting for data" state rather than rendering
   * fake history.
   *
   * Production hookup: replace `loadSnapshots` with a Kysely query
   * against `apps/indexer`'s Postgres schema:
   *
   *   const rows = await db
   *     .selectFrom('protocol_snapshots')
   *     .selectAll()
   *     .orderBy('timestamp', 'desc')
   *     .limit(months)
   *     .execute();
   */
  app.get<{ Querystring: { months?: string } }>('/stats/timeseries', async (request) => {
    const parse = timeseriesQuery.safeParse(request.query);
    if (!parse.success) {
      throw new Error(parse.error.message);
    }
    const { months } = parse.data;

    const rows = await loadSnapshots(months);

    if (rows.length === 0) {
      const resp: StatsTimeseriesResponse = {
        points: [],
        ready: false,
        months,
      };
      return resp;
    }

    const points = rows.map((row) => {
      const ts = row.timestamp instanceof Date ? row.timestamp.getTime() / 1000 : Number(row.timestamp);
      const d = new Date(ts * 1000);
      const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      return {
        label,
        timestamp: ts,
        capacity: Number(row.capacity_w ?? 0),
        shares: String(row.shares_outstanding ?? '0'),
        yield: String(row.yield_claimed ?? '0'),
      };
    });

    const resp: StatsTimeseriesResponse = {
      points,
      ready: points.length >= months,
      months,
    };
    return resp;
  });
}

/**
 * Loads the last `months` protocol snapshots. The scaffold returns an
 * empty array; production swaps this for a real DB query (see the
 * production hookup comment in the route above).
 */
async function loadSnapshots(_months: number): Promise<ProtocolSnapshotRow[]> {
  return [];
}
