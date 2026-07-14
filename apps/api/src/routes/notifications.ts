import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Notification, NotificationCount, Paginated } from '@solshare/shared';
import { cache } from '../lib/cache.js';
import { logger } from '../lib/logger.js';

const listQuery = z.object({
  address: z.string().min(2),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

const markReadBody = z.object({
  address: z.string().min(2),
  ids: z.array(z.string()).default([]),
  markAll: z.boolean().default(false),
});

export async function notificationRoutes(app: FastifyInstance) {
  /** List notifications for an address. */
  app.get<{ Querystring: { address: string; page?: string; pageSize?: string; unreadOnly?: string } }>(
    '/notifications',
    async (request, reply) => {
      const parse = listQuery.safeParse(request.query);
      if (!parse.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parse.error.message } });
      }
      const { address, page, pageSize } = parse.data;
      const resp: Paginated<Notification> = {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
      void address;
      return resp;
    },
  );

  /** Get unread notification count. */
  app.get<{ Querystring: { address: string } }>(
    '/notifications/count',
    async (request, reply) => {
      const address = (request.query as { address?: string })?.address;
      if (!address) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'address required' } });
      }
      const record = await cache.get<NotificationCount>(`notif:count:${address}`);
      if (record) return record;
      const resp: NotificationCount = {
        total: 0,
        unread: 0,
        byCategory: {
          yield: 0,
          bridge: 0,
          governance: 0,
          array: 0,
          system: 0,
          wallet: 0,
        },
      };
      return resp;
    },
  );

  /** Mark notifications as read. */
  app.post('/notifications/read', async (request, reply) => {
    const parse = markReadBody.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parse.error.message } });
    }
    const body = parse.data;
    logger.info({ address: body.address, ids: body.ids, markAll: body.markAll }, 'mark read');
    void [body];
    return { status: 'ok' };
  });
}
