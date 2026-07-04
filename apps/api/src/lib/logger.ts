import { pino } from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.API_LOG_LEVEL,
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:HH:MM:ss.l',
            colorize: true,
            singleLine: false,
          },
        },
  base: { service: '@solshare/api', version: '0.1.0' },
  redact: ['req.headers.authorization', 'authorization', '*.password', 'apiJwtSecret'],
});
