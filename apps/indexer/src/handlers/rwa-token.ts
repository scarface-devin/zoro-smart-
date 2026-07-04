import { getDb } from '../db/client.js';
import { arrays } from '../db/schema.js';
import { logger } from '../logger.js';
import type { SorobanEvent } from '@solshare/sdk';

/**
 * Materialise `rwa-token` events into the `arrays` + `holder_balances` tables.
 *
 * Used by the orchestrator (see `poller.ts`) to keep the indexed view in sync
 * with the contract events.
 */
export async function handleRwaTokenEvent(event: SorobanEvent): Promise<void> {
  const db = getDb();
  const [_admin, action] = event.topic;
  if (action === 'init') {
    logger.debug('rwa-token init');
    return;
  }
  void db; // placeholder hooks for upserts
}
