import { z } from 'zod';

/**
 * Centralised, validated environment loader. Crashes at startup if required
 * variables are missing — that's strictly better than failing later.
 */
const schema = z.object({
  STELLAR_NETWORK: z.enum(['PUBLIC', 'TESTNET', 'FUTURENET', 'STANDALONE']).default('TESTNET'),
  STELLAR_HORIZON_URL: z.string().url().optional(),
  STELLAR_SOROBAN_RPC_URL: z.string().url().optional(),
  STELLAR_NETWORK_PASSPHRASE: z.string().optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  API_CORS_ORIGIN: z.string().default('http://localhost:5173'),
  API_JWT_SECRET: z.string().min(16).optional(),
  API_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  INDEXER_DATABASE_URL: z.string().optional(),
  INDEXER_REDIS_URL: z.string().optional(),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().default('solshare'),
  POSTGRES_PASSWORD: z.string().default('solshare'),
  POSTGRES_DB: z.string().default('solshare'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // `no-console` allows `console.error` and `console.warn` by default
  // (see https://eslint.org/docs/latest/rules/no-console), so no
  // eslint-disable directive is needed here.
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type ApiEnv = typeof env;
