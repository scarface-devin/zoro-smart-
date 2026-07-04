import './lib/env.js';
import { buildServer } from './server.js';
import { logger } from './lib/logger.js';

async function main() {
  const app = await buildServer();
  const port = Number(process.env.API_PORT ?? 4000);
  const host = process.env.API_HOST ?? '0.0.0.0';
  try {
    await app.listen({ port, host });
    logger.info({ port, host }, 'SolShare API listening');
  } catch (err) {
    logger.error({ err }, 'Failed to start API');
    process.exit(1);
  }
}

void main();
