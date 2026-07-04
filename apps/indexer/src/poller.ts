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

  // eslint-disable-next-line no-constant-condition
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
  const topic = e.topic[0] ?? '';
  const kn = Object.keys(CONTRACT_EVENTS) as (keyof typeof CONTRACT_EVENTS)[];
  for (const k of kn) {
    if (topic.startsWith(CONTRACT_EVENTS[k])) return k;
  }
  return 'Init';
}
