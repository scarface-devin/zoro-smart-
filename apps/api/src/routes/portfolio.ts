import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PortfolioSummary, PortfolioTransaction, Paginated } from '@solshare/shared';
import { getClient } from '../lib/stellar.js';
import { cache } from '../lib/cache.js';
import { logger } from '../lib/logger.js';

const holdingParams = z.object({
  holder: z.string().min(2),
});

const txQuery = z.object({
  holder: z.string().min(2),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
});

export async function portfolioRoutes(app: FastifyInstance) {
  /** Get full portfolio summary for a holder. */
  app.get<{ Querystring: { holder: string } }>(
    '/portfolio',
    async (request, reply) => {
      const parse = holdingParams.safeParse(request.query);
      if (!parse.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parse.error.message } });
      }
      const { holder } = parse.data;
      const cacheKey = `portfolio:${holder}`;
      const cached = await cache.get<PortfolioSummary>(cacheKey);
      if (cached) return cached;

      const client = getClient();
      try {
        const allArrays = await client.registry.getAllArrays().catch(() => []);
        const holdings = await Promise.all(
          allArrays
            .filter((a) => a.tokenContract)
            .slice(0, 20)
            .map(async (arr) => {
              const balance = await client.rwaToken.balance(arr.tokenContract!, holder).catch(() => '0');
              const claimable = await client.yieldDistributor.claimable(holder).catch(() => '0');
              const yps = await client.yieldDistributor.yieldPerShare().catch(() => '0');
              return {
                arrayId: arr.id,
                arrayName: arr.name,
                tokenContract: arr.tokenContract!,
                balance,
                sharePercentage: 0,
                valueUsdc: '0',
                claimableYield: claimable,
                claimedYield: '0',
                yieldPerShare: yps,
                capacityW: arr.ratedCapacityW,
                status: arr.status,
              };
            }),
        );

        const resp: PortfolioSummary = {
          holder,
          totalArrays: holdings.length,
          totalShares: holdings.reduce((sum, h) => sum + BigInt(h.balance), 0n).toString(),
          totalValueUsdc: '0',
          totalClaimableYield: holdings.reduce(
            (sum, h) => sum + BigInt(h.claimableYield),
            0n,
          ).toString(),
          totalClaimedYield: '0',
          holdings,
          lastUpdated: Math.floor(Date.now() / 1000),
        };
        await cache.set(cacheKey, resp, 15);
        return resp;
      } catch (err) {
        logger.error({ err }, 'portfolio fetch failed');
        const empty: PortfolioSummary = {
          holder,
          totalArrays: 0,
          totalShares: '0',
          totalValueUsdc: '0',
          totalClaimableYield: '0',
          totalClaimedYield: '0',
          holdings: [],
          lastUpdated: Math.floor(Date.now() / 1000),
        };
        return empty;
      }
    },
  );

  /** Get transaction history for a holder's portfolio. */
  app.get<{ Querystring: { holder: string; page?: string; pageSize?: string; type?: string } }>(
    '/portfolio/transactions',
    async (request, reply) => {
      const parse = txQuery.safeParse(request.query);
      if (!parse.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parse.error.message } });
      }
      const { holder, page, pageSize } = parse.data;
      const resp: Paginated<PortfolioTransaction> = {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
      void holder;
      return resp;
    },
  );
}
