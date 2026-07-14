/**
 * Shared Postgres connection for the API layer. Uses the same database
 * as the indexer so both services read/write the same tables.
 *
 * The notifications table is defined here (mirrors the indexer's schema)
 * to avoid a cross-package dependency on @solshare/indexer.
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  pgTable,
  bigserial,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { logger } from './logger.js';

/* ------------------------------------------------------------------ */
/*  Table definitions (mirrors apps/indexer/src/db/schema.ts)         */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  'notifications',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    recipient: text('recipient').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    category: text('category').notNull(),
    severity: text('severity').notNull().default('info'),
    read: boolean('read').notNull().default(false),
    actionUrl: text('action_url'),
    actionLabel: text('action_label'),
    arrayId: text('array_id'),
    txHash: text('tx_hash'),
    sourcePagingToken: text('source_paging_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => ({
    byRecipient: index('notif_recipient_idx').on(t.recipient, t.read),
    byCategory: index('notif_category_idx').on(t.category),
  }),
);

export type DbNotification = typeof notifications.$inferSelect;
export type DbNotificationInsert = typeof notifications.$inferInsert;

/* ------------------------------------------------------------------ */
/*  Connection singleton                                                */
/* ------------------------------------------------------------------ */

const schema = { notifications };
type Schema = typeof schema;
let _db: PostgresJsDatabase<Schema> | null = null;

function buildUrl(): string {
  const full = process.env.INDEXER_DATABASE_URL;
  if (full) return full;
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const user = process.env.POSTGRES_USER ?? 'solshare';
  const pass = process.env.POSTGRES_PASSWORD ?? 'solshare';
  const db = process.env.POSTGRES_DB ?? 'solshare';
  return `postgres://${user}:${pass}@${host}:${port}/${db}`;
}

export function getDb(): PostgresJsDatabase<Schema> {
  if (_db) return _db;
  const url = buildUrl();
  const sql = postgres(url, { onnotice: () => {} });
  _db = drizzle(sql, { schema });
  logger.info('api postgres connected');
  return _db;
}
