// Module augmentation: pino-pretty attaches `msgPrefix` to Fastify's
// child logger at runtime; declare it on the public interface so route
// handlers don't have to `as unknown` at every site.

import 'fastify';

declare module 'fastify' {
  interface FastifyBaseLogger {
    msgPrefix?: string;
  }
}

export {};
