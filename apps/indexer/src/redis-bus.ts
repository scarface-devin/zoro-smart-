/**
 * ioredis wrapper. The library is published with `export = Redis` (CJS-style)
 * so when imported with esModuleInterop the default-import resolves to the
 * class, but TypeScript still surfaces it as a namespace. We deliberately
 * avoid using the imported name as a type annotation and let inference
 * (or `any` on private state) carry the rest.
 */

import { Redis } from 'ioredis';
import { logger } from './logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pub: any = null;

export async function connectRedis(): Promise<Redis | null> {
  if (!process.env.INDEXER_REDIS_URL) return null;
  if (_pub) return _pub;
  _pub = new Redis(process.env.INDEXER_REDIS_URL, { lazyConnect: true });
  _pub.on('error', (err: Error) => logger.warn({ err }, 'redis pub error'));
  await _pub.connect().catch((e: Error) => logger.warn({ e }, 'redis connect failed'));
  return _pub;
}

export async function publish(channel: string, message: unknown): Promise<void> {
  if (!_pub) return;
  await _pub.publish(channel, JSON.stringify(message)).catch((err: Error) => {
    logger.warn({ err }, 'redis publish failed');
  });
}
