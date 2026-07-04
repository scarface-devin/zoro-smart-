import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BridgeTransaction, BridgeTransactionDetail, Paginated } from '@solshare/shared';
import { getClient } from '../lib/stellar.js';
import { logger } from '../lib/logger.js';

const listQuery = z.object({
  status: z.string().optional(),
  sourceChain: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const wrapSchema = z.object({
  chainId: z.number().int().positive(),
  sourceTxHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  sourceToken: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  sender: z.string().min(2),
  recipient: z.string().min(2),
  amount: z.string().regex(/^[0-9]+$/),
  nonce: z.number().int().nonnegative(),
  signatures: z.array(
    z.object({
      validator: z.string().min(2),
      signature: z.string().regex(/^0x[0-9a-fA-F]{128,}$/),
    }),
  ),
});

const unwrapSchema = z.object({
  chainId: z.number().int().positive(),
  recipient: z.string().min(2),
  amount: z.string().regex(/^[0-9]+$/),
  nonce: z.number().int().nonnegative(),
  sender: z.string().min(2),
});

export async function bridgeRoutes(app: FastifyInstance) {
  app.get('/bridge/transactions', async (request) => {
    const parse = listQuery.safeParse(request.query);
    if (!parse.success) throw new Error(parse.error.message);
    const { status, sourceChain, page, pageSize } = parse.data;
    void [status, sourceChain, page, pageSize]; // surfaced via indexer in production
    const resp: Paginated<BridgeTransaction> = {
      items: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    };
    return resp;
  });

  app.get<{ Params: { id: string } }>('/bridge/transactions/:id', async (request, reply) => {
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  app.post('/bridge/wrap', async (request, reply) => {
    const parse = wrapSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parse.error.message } });
    }
    const body = parse.data;
    logger.info({ tx: body.sourceTxHash }, 'bridge wrap submission');
    const client = getClient();
    let op: unknown = null;
    try {
      op = await client.bridge.buildWrap(
        {
          chainId: body.chainId,
          sourceTxHash: body.sourceTxHash,
          sourceToken: body.sourceToken,
          sender: body.sender,
          recipient: body.recipient,
          amount: body.amount,
          nonce: body.nonce,
        },
        body.signatures,
      );
    } catch (e) {
      logger.error({ err: e }, 'buildWrap failed');
    }
    const now = Math.floor(Date.now() / 1000);
    const resp: BridgeTransactionDetail = {
      id: body.sourceTxHash,
      direction: 'wrap',
      sourceChain: 'ethereum',
      sourceTxHash: body.sourceTxHash,
      sorobanTxHash: undefined,
      wrappedToken: '',
      amount: body.amount,
      sender: body.sender,
      recipient: body.recipient,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
      ledger: 0,
      operation: op,
    };
    return resp;
  });

  app.post('/bridge/unwrap', async (request, reply) => {
    const parse = unwrapSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parse.error.message } });
    }
    const body = parse.data;
    logger.info({ chain: body.chainId, nonce: body.nonce }, 'bridge unwrap submission');
    const resp: BridgeTransactionDetail = {
      id: `${body.chainId}:${body.sender}:unwrap:${body.nonce}`,
      direction: 'unwrap',
      sourceChain: 'ethereum',
      sourceTxHash: '',
      wrappedToken: '',
      amount: body.amount,
      sender: body.sender,
      recipient: body.recipient,
      status: 'submitted',
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      ledger: 0,
    };
    return resp;
  });
}
