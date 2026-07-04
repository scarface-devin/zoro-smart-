import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getClient } from '../lib/stellar.js';

const querySchema = z.object({
  startLedger: z.coerce.number().int().positive(),
  contractIds: z.string().optional(),
});

export async function streamRoutes(app: FastifyInstance) {
  app.get('/stream/payments/:address', async (request, reply) => {
    const address = (request.params as { address: string }).address;
    const client = getClient();
    const horizonUrl = client.horizonUrl;
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    const res = await fetch(`${horizonUrl}/accounts/${address}/payments?_format=event_stream`);
    if (!res.body) {
      reply.raw.writeHead(502);
      reply.raw.end();
      return;
    }
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    reply.raw.writeHead(200);
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        reply.raw.end();
        return;
      }
      reply.raw.write(Buffer.from(value));
    }
  });

  app.get('/stream/events', async (request, reply) => {
    const parse = querySchema.safeParse(request.query);
    if (!parse.success) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parse.error.message } });
    }
    const contractIds = parse.data.contractIds?.split(',').filter(Boolean) ?? [];
    const client = getClient();
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.writeHead(200);
    let alive = true;
    request.raw.on('close', () => {
      alive = false;
    });
    let cursor = parse.data.startLedger;
    while (alive) {
      try {
        const events = await client.soroban.getEvents({
          startLedger: cursor,
          contractIds,
          limit: 100,
        });
        for (const e of events.events) {
          reply.raw.write(`event: event\ndata: ${JSON.stringify(e)}\n\n`);
        }
        cursor = events.latestLedger + 1;
      } catch (err) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: String(err) })}\n\n`);
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
    reply.raw.end();
  });
}
