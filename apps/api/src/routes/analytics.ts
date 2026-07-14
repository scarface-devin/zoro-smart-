import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  VolumeAnalytics,
  TopArraysResponse,
  YieldProjection,
} from '@solshare/shared';
import { getClient } from '../lib/stellar.js';
import { cache } from '../lib/cache.js';

const volumeQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const topQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
  sort: z.enum(['capacity', 'yield', 'shares']).default('yield'),
});

export async function analyticsRoutes(app: FastifyInstance) {
  /** Bridge volume analytics over a time window. */
  app.get<{ Querystring: { days?: string } }>(
    '/analytics/volume',
    async (request) => {
      const parse = volumeQuery.safeParse(request.query);
      if (!parse.success) throw new Error(parse.error.message);
      const { days } = parse.data;
      const cacheKey = `analytics:volume:${days}`;
      const cached = await cache.get<VolumeAnalytics>(cacheKey);
      if (cached) return cached;

      const resp: VolumeAnalytics = {
        totalBridgeVolumeUsdc: '0',
        totalWraps: 0,
        totalUnwraps: 0,
        daily: [],
        topChains: [],
        days,
      };
      await cache.set(cacheKey, resp, 30);
      return resp;
    },
  );

  /** Top-performing arrays by a chosen metric. */
  app.get<{ Querystring: { limit?: string; sort?: string } }>(
    '/analytics/top-arrays',
    async (request) => {
      const parse = topQuery.safeParse(request.query);
      if (!parse.success) throw new Error(parse.error.message);
      const { limit, sort } = parse.data;
      const cacheKey = `analytics:top-arrays:${sort}:${limit}`;
      const cached = await cache.get<TopArraysResponse>(cacheKey);
      if (cached) return cached;

      const client = getClient();
      const allArrays = await client.registry.getAllArrays().catch(() => []);

      const entries = allArrays
        .slice(0, 50)
        .map((a) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          ratedCapacityW: a.ratedCapacityW,
          yieldPerShare: a.yieldPerShare ?? '0',
          totalShares: a.totalSupply ?? '0',
          co2OffsetKgPerYear: a.impact?.co2OffsetKgPerYear ?? 0,
        }))
        .sort((a, b) => {
          if (sort === 'capacity') return b.ratedCapacityW - a.ratedCapacityW;
          if (sort === 'shares') return Number(BigInt(b.totalShares) - BigInt(a.totalShares));
          return Number(BigInt(b.yieldPerShare) - BigInt(a.yieldPerShare));
        })
        .slice(0, limit);

      const resp: TopArraysResponse = {
        entries,
        sortBy: sort,
        limit,
      };
      await cache.set(cacheKey, resp, 30);
      return resp;
    },
  );

  /** Yield projection for an array. */
  app.get<{ Querystring: { arrayId: string; shares?: string; months?: string } }>(
    '/analytics/yield-projection',
    async (request, reply) => {
      const arrayId = (request.query as { arrayId?: string })?.arrayId;
      const shares = (request.query as { shares?: string })?.shares ?? '100';
      const months = Number((request.query as { months?: string })?.months ?? '12');

      if (!arrayId) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'arrayId required' } });
      }

      const client = getClient();
      const arr = await client.registry.getArray(arrayId).catch(() => null);

      const expectedKwh = arr?.impact?.expectedYieldKwhPerYear ?? 0;
      const monthlyKwh = expectedKwh / 12;
      const projected = Array.from({ length: months }, (_, i) => ({
        month: i + 1,
        label: `Month ${i + 1}`,
        projectedYield: String(Math.round(monthlyKwh * 1000)),
        cumulativeYield: String(Math.round(monthlyKwh * (i + 1) * 1000)),
      }));

      const resp: YieldProjection = {
        arrayId,
        shares,
        months,
        monthlyKwhEstimate: Math.round(monthlyKwh),
        annualKwhEstimate: expectedKwh,
        projected,
      };
      return resp;
    },
  );
}
