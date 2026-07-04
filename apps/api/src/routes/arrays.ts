import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Paginated, SolarArraySummary, SolarArrayDetail } from '@solshare/shared';
import { getClient } from '../lib/stellar.js';
import { cache } from '../lib/cache.js';

const listQuery = z.object({
  status: z.enum(['Pending', 'Active', 'Maintenance', 'Decommissioned']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function arrayRoutes(app: FastifyInstance) {
  app.get('/arrays', async (request) => {
    const parse = listQuery.safeParse(request.query);
    if (!parse.success) {
      throw new Error(parse.error.message);
    }
    const { status, page, pageSize } = parse.data;
    const cacheKey = `arrays:${status ?? 'all'}:${page}:${pageSize}`;
    const cached = await cache.get<Paginated<SolarArraySummary>>(cacheKey);
    if (cached) return cached;
    const client = getClient();
    const all = await client.registry.getAllArrays().catch(() => []);
    const filtered = status ? all.filter((a) => a.status === status) : all;
    const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
    const resp: Paginated<SolarArraySummary> = {
      items: slice,
      total: filtered.length,
      page,
      pageSize,
      hasMore: page * pageSize < filtered.length,
    };
    await cache.set(cacheKey, resp, 15);
    return resp;
  });

  app.get<{ Params: { id: string } }>('/arrays/:id', async (request, reply) => {
    const id = request.params.id;
    const client = getClient();
    const arr = await client.registry.getArray(id);
    if (!arr) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Array not found' } });
    const detail: SolarArrayDetail = {
      ...arr,
      ledgerTimestamp: Math.floor(Date.now() / 1000),
      acceptingInvestors: arr.status === 'Active',
    };
    return detail;
  });
}
