/**
 * Redis cache wrapper. See apps/indexer/src/redis-bus.ts for the rationale
 * behind `import Redis from 'ioredis'` plus the `any` escape hatch on
 * private state.
 */

import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

// `any` on private module state keeps the redis client untyped — fine for
// a thin cache wrapper. `@typescript-eslint/no-explicit-any` is not enabled
// in the recommended preset, so no eslint-disable is needed.
let _redis: any = null;

function buildRedis(): Redis | null {
  if (!env.INDEXER_REDIS_URL) return null;
  try {
    const r = new Redis(env.INDEXER_REDIS_URL, { lazyConnect: true });
    r.on('error', (err: Error) => logger.warn({ err }, 'redis error'));
    void r.connect().then(() => logger.info('redis connected')).catch(() => undefined);
    return r;
  } catch {
    return null;
  }
}

export function getRedis(): Redis | null {
  if (!_redis) _redis = buildRedis();
  return _redis;
}

/** Cache helpers that no-op if Redis is not configured. */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const r = getRedis();
    if (!r) return null;
    const raw = await r.get(key).catch(() => null);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set<T>(key: string, value: T, ttlSeconds = 30): Promise<void> {
    const r = getRedis();
    if (!r) return;
    await r.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch(() => undefined);
  },
  async del(key: string): Promise<void> {
    const r = getRedis();
    if (!r) return;
    await r.del(key).catch(() => undefined);
  },
};
