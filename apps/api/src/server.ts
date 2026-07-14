import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { healthRoutes } from './routes/health.js';
import { statsRoutes } from './routes/stats.js';
import { arrayRoutes } from './routes/arrays.js';
import { bridgeRoutes } from './routes/bridge.js';
import { yieldRoutes } from './routes/yield.js';
import { streamRoutes } from './routes/stream.js';
import { governanceRoutes } from './routes/governance.js';
import { portfolioRoutes } from './routes/portfolio.js';
import { notificationRoutes } from './routes/notifications.js';
import { searchRoutes } from './routes/search.js';

export async function buildServer(): Promise<FastifyInstance> {
  // A custom pino childlogger is supplied via `loggerInstance`; the
  // accompanying `types/fastify-logger.d.ts` augments Fastify's
  // FastifyBaseLogger so route handlers see the right shape.

  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.API_CORS_ORIGIN.split(','), credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'SolShare Network API',
        version: '0.1.0',
        description:
          'HTTP gateway that fronts the SolShare Soroban SDK and the cross-chain bridge middleware.',
      },
      servers: [{ url: `http://${env.API_HOST}:${env.API_PORT}` }],
      tags: [
        { name: 'health' },
        { name: 'stats' },
        { name: 'arrays' },
        { name: 'bridge' },
        { name: 'yield' },
        { name: 'stream' },
        { name: 'governance' },
        { name: 'portfolio' },
        { name: 'notifications' },
        { name: 'search' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(statsRoutes, { prefix: '/api' });
  await app.register(arrayRoutes, { prefix: '/api' });
  await app.register(bridgeRoutes, { prefix: '/api' });
  await app.register(yieldRoutes, { prefix: '/api' });
  await app.register(streamRoutes, { prefix: '/api' });
  await app.register(governanceRoutes, { prefix: '/api' });
  await app.register(portfolioRoutes, { prefix: '/api' });
  await app.register(notificationRoutes, { prefix: '/api' });
  await app.register(searchRoutes, { prefix: '/api' });

  app.setErrorHandler((error: unknown, request, reply) => {
    logger.error({ err: error, url: request.url }, 'request failed');
    const e = (error ?? {}) as {
      statusCode?: number;
      code?: string;
      message?: string;
    };
    const status = typeof e.statusCode === 'number' ? e.statusCode : 500;
    void reply.status(status).send({
      error: {
        code: e.code ?? 'INTERNAL_SERVER_ERROR',
        message: e.message ?? 'Internal server error',
      },
    });
  });

  return app as unknown as FastifyInstance;
}
