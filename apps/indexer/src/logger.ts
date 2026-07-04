import { pino } from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { translateTime: 'SYS:HH:MM:ss.l', colorize: true },
        },
  base: { service: '@solshare/indexer', version: '0.1.0' },
});
