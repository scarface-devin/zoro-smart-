import { getDb } from '../db/client.js';
import { bridgeTxs } from '../db/schema.js';
import { logger } from '../logger.js';
import type { SorobanEvent } from '@solshare/sdk';

/**
 * Materialise `bridge-wrapper` events into the `bridge_txs` table.
 */
export async function handleBridgeWrapperEvent(event: SorobanEvent): Promise<void> {
  const db = getDb();
  const [_admin, action] = event.topic;
  if (action !== 'wrap' && action !== 'unwrap') return;
  const chainIdRaw = (event.value as { chain_id?: number | string | bigint })?.chain_id;
  const chainId = (chainIdRaw !== undefined ? chainIdRaw.toString() : '0').padStart(8, '0');
  const sourceTxHashRaw = (event.value as { source_tx_hash?: unknown })?.source_tx_hash;
  const sourceTxHash = coerceBytes32ToHex(sourceTxHashRaw);
  const compositeId = `${chainId}:${sourceTxHash}:${action}`;
  try {
    await db
      .insert(bridgeTxs)
      .values({
        id: compositeId,
        direction: action,
        sourceChain: 'ethereum',
        sourceTxHash,
        wrappedToken: event.contractId,
        amount: String((event.value as { amount?: number | string })?.amount ?? '0'),
        sender: (event.value as { sender?: string })?.sender ?? '',
        recipient: (event.value as { recipient?: string })?.recipient ?? '',
        status: action === 'wrap' ? 'minted' : 'released',
        ledger: event.ledger,
      })
      .onConflictDoNothing();
  } catch (err) {
    logger.warn({ err }, 'bridge_txs insert failed');
  }
}

/**
 * Coerce a Soroban `BytesN<32>` value (emitted as base64 or
 * Uint8Array-encoded into the JSON event envelope) into a canonical
 * lowercase `0x`-prefixed hex string of length 66.
 */
function coerceBytes32ToHex(raw: unknown): string {
  if (raw == null) return '0x' + '00'.repeat(32);
  if (typeof raw === 'string') {
    if (raw.startsWith('0x') && raw.length === 66) return raw.toLowerCase();
    if (raw.length === 64) return '0x' + raw.toLowerCase();
    try {
      const bytes = Buffer.from(raw, 'base64');
      if (bytes.length === 32) return '0x' + bytes.toString('hex');
    } catch {
      /* fall through */
    }
    return raw;
  }
  if (raw instanceof Uint8Array) {
    if (raw.length === 32) return '0x' + Buffer.from(raw).toString('hex');
  }
  if (Array.isArray(raw) && raw.length === 32) {
    return '0x' + raw.map((b) => (b as number).toString(16).padStart(2, '0')).join('');
  }
  return '0x' + '00'.repeat(32);
}
