import type { FastifyInstance } from 'fastify';
import { env } from '../lib/env.js';
import type { HealthCheckResponse } from '@solshare/shared';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    const startedAt = Date.now();
    const [horizonRes, sorobanRes] = await Promise.allSettled([
      fetch(env.STELLAR_HORIZON_URL ?? ''),
      fetch(env.STELLAR_SOROBAN_RPC_URL ?? '', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestLedger', params: {} }),
      }),
    ]);
    const resp: HealthCheckResponse = {
      status:
        horizonRes.status === 'fulfilled' && sorobanRes.status === 'fulfilled'
          ? 'ok'
          : 'degraded',
      version: '0.2.0',
      network: env.STELLAR_NETWORK,
      horizonReachable: horizonRes.status === 'fulfilled',
      sorobanReachable: sorobanRes.status === 'fulfilled',
      databaseReachable: false,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    };
    return resp;
  });
}
