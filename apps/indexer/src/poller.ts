import type { SorobanEvent } from '@solshare/sdk';
import { SorobanClient } from '@solshare/sdk';
import { CONTRACT_EVENTS } from '@solshare/shared';
import { getDb } from './db/client.js';
import { events } from './db/schema.js';
import { logger } from './logger.js';

export interface PollerOpts {
  rpcUrl: string;
  contractIds: string[];
  intervalMs: number;
  startLedger: number;
  onEvent?: (event: SorobanEvent) => Promise<void>;
}

/** Long-running poll loop. Resilient to network failures. */
export async function startPoller(opts: PollerOpts): Promise<void> {
  const soroban = new SorobanClient(opts.rpcUrl);
  const db = getDb();
  let cursor = opts.startLedger;

  // Resume from DB if no start was given.
  if (cursor === 0) {
    const last = await db
      .select({ ledger: events.ledger })
      .from(events)
      .orderBy(events.ledger)
      .limit(1);
    cursor = last[0]?.ledger ?? 0;
  }
  logger.info({ cursor }, 'poller: starting from ledger');

  // `no-constant-condition` has a documented exception for `while (true)`
  // (legitimate infinite event loop), so no eslint-disable is needed here.
  while (true) {
    try {
      const batch = await soroban.getEvents({
        startLedger: cursor,
        contractIds: opts.contractIds,
        limit: 200,
      });
      for (const event of batch.events) {
        cursor = Math.max(cursor, event.ledger + 1);
        try {
          await db
            .insert(events)
            .values({
              ledger: event.ledger,
              contractId: event.contractId,
              topic: event.topic,
              value: event.value as object,
              pagingToken: event.pagingToken,
              raw: event as unknown as object,
            })
            .onConflictDoNothing();
        } catch (e) {
          logger.warn({ err: e, paging: event.pagingToken }, 'event insert failed');
        }
        if (opts.onEvent) await opts.onEvent(event);
      }
    } catch (err) {
      logger.error({ err }, 'poller: getEvents failed');
    }
    await new Promise((r) => setTimeout(r, opts.intervalMs));
  }
}

/** Lightweight helper used by tests. */
export function classifyEvent(e: SorobanEvent): keyof typeof CONTRACT_EVENTS {
  if (!e.topic.length) return 'Init';
  const rawTopic = e.topic[0] ?? '';
  // The Soroban RPC `getEvents` response encodes topics as either:
  //   1. A plain string (e.g. "mint") — produced by our mock harness and
  //      some older versions of the RPC.
  //   2. A JSON-serialised ScVal object like {"type":"symbol","value":"mint"}
  //      — the canonical form returned by the live Testnet / Public RPC.
  //      ScvSymbol is the standard encoding for contract event topics.
  // We try to extract the string value from either shape.
  let topic: string;
  if (typeof rawTopic === 'string' && rawTopic.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawTopic) as unknown;
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'value' in (parsed as Record<string, unknown>)
      ) {
        topic = String((parsed as Record<string, unknown>).value);
      } else {
        topic = rawTopic;
      }
    } catch {
      topic = rawTopic;
    }
  } else {
    topic = typeof rawTopic === 'string' ? rawTopic : String(rawTopic);
  }

  const kn = Object.keys(CONTRACT_EVENTS) as (keyof typeof CONTRACT_EVENTS)[];
  for (const k of kn) {
    if (topic.startsWith(CONTRACT_EVENTS[k])) return k;
  }
  return 'Init';
}
