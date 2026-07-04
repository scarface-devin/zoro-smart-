import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '../logger.js';
import * as schema from './schema.js';

type Schema = typeof schema;
let _db: PostgresJsDatabase<Schema> | null = null;

export function getDb(): PostgresJsDatabase<Schema> {
  if (_db) return _db;
  const url =
    process.env.INDEXER_DATABASE_URL ??
    'postgres://solshare:solshare@localhost:5432/solshare';
  const sql = postgres(url, { onnotice: () => {} });
  _db = drizzle(sql, { schema });
  logger.info('postgres connected');
  return _db;
}
