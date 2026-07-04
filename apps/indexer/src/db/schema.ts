import {
  pgTable,
  bigserial,
  text,
  integer,
  bigint,
  timestamp,
  index,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/** Persisted view of every contract event we've indexed. */
export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    ledger: integer('ledger').notNull(),
    contractId: text('contract_id').notNull(),
    topic: jsonb('topic').notNull(),
    value: jsonb('value').notNull(),
    pagingToken: text('paging_token').notNull(),
    raw: jsonb('raw').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqPage: uniqueIndex('events_paging_token_uq').on(t.pagingToken),
    byContract: index('events_contract_idx').on(t.contractId, t.ledger),
  }),
);

/** Cached view of registered solar arrays. */
export const arrays = pgTable(
  'arrays',
  {
    id: text('id').primaryKey(), // BytesN<32> hex
    name: text('name').notNull(),
    operator: text('operator').notNull(),
    location: jsonb('location').notNull(),
    panelCount: integer('panel_count').notNull(),
    panelTech: text('panel_tech').notNull(),
    ratedCapacityW: bigint('rated_capacity_w', { mode: 'bigint' }).notNull(),
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull(),
    status: text('status').notNull(),
    impact: jsonb('impact').notNull(),
    tokenContract: text('token_contract'),
    metadataUri: text('metadata_uri'),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byStatus: index('arrays_status_idx').on(t.status),
  }),
);

/** Bridge state. */
export const bridgeTxs = pgTable(
  'bridge_txs',
  {
    /** Composite id of `chain_id:source_tx_hash:direction` to keep unique. */
    id: text('id').primaryKey(),
    direction: text('direction').notNull(), // wrap | unwrap
    sourceChain: text('source_chain').notNull(),
    sourceTxHash: text('source_tx_hash').notNull(),
    sorobanTxHash: text('soroban_tx_hash'),
    wrappedToken: text('wrapped_token').notNull(),
    amount: text('amount').notNull(),
    sender: text('sender').notNull(),
    recipient: text('recipient').notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    blockNumber: bigint('block_number', { mode: 'bigint' }),
    blockConfirmations: integer('block_confirmations'),
    signaturesReceived: integer('signatures_received'),
    signaturesRequired: integer('signatures_required'),
    failureReason: text('failure_reason'),
    ledger: integer('ledger'),
    feeCharged: text('fee_charged'),
    memo: text('memo'),
  },
  (t) => ({
    byStatus: index('bridge_status_idx').on(t.status),
    byChain: index('bridge_chain_idx').on(t.sourceChain),
  }),
);

/** Yield claims log. */
export const yieldClaims = pgTable(
  'yield_claims',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    holder: text('holder').notNull(),
    distributorId: text('distributor_id').notNull(),
    amount: text('amount').notNull(),
    paymentToken: text('payment_token').notNull(),
    txHash: text('tx_hash').notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byHolder: index('claims_holder_idx').on(t.holder),
  }),
);

/** A rolling stat-snapshot per ledger. */
export const statsSnapshots = pgTable('stats_snapshots', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  ledger: integer('ledger').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  totalArrays: integer('total_arrays').notNull(),
  activeArrays: integer('active_arrays').notNull(),
  totalCapacityW: bigint('total_capacity_w', { mode: 'bigint' }).notNull(),
  totalSharesOutstanding: text('total_shares_outstanding').notNull(),
  totalYieldClaimed: text('total_yield_claimed').notNull(),
  totalBridgedVolume: text('total_bridged_volume').notNull(),
});

export type DbEvent = typeof events.$inferSelect;
export type DbArray = typeof arrays.$inferSelect;
export type DbBridgeTx = typeof bridgeTxs.$inferSelect;
export type DbYieldClaim = typeof yieldClaims.$inferSelect;
