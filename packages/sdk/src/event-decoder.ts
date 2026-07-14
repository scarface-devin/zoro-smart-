/**
 * Strongly-typed decoder for Soroban contract events emitted by the
 * SolShare protocol. The off-chain indexer emits raw `SorobanEvent`
 * records (string topics + JSON-ish payloads via the proxy). This
 * module tags them with both contract-id labels and a kind discriminator
 * so consumers don't have to inspect `event.topic[0]` defensively.
 *
 * Topic strings come from `CONTRACT_EVENTS` in `@solshare/shared`, so
 * re-naming a topic in one place keeps the decoder aligned.
 */

import { CONTRACT_EVENTS } from '@solshare/shared';
import type { SorobanEvent } from './soroban.js';

/**
 * Per-contract IDs the SDK uses to disambiguate events with the same
 * topic (e.g. a `transfer` topic emitted by both the rwa-token and
 * the bridge-wrapper contracts).
 *
 * Caller passes this to `decodeEvent`/`decodeEvents` so that an
 * unrelated contract emitting `transfer` is correctly filtered out.
 */
export interface ContractTags {
  rwaToken?: string;
  registry?: string;
  yield?: string;
  bridge?: string;
  governance?: string;
}

export type SolShareEventKind =
  | 'mint'
  | 'burn'
  | 'transfer'
  | 'approve'
  | 'register'
  | 'update'
  | 'decommission'
  | 'fund'
  | 'claim'
  | 'wrap'
  | 'unwrap'
  | 'vote';

export type SolShareEvent =
  | {
      kind: 'mint';
      contractId: string;
      ledger: number;
      data: { to: string; amount: string };
    }
  | {
      kind: 'burn';
      contractId: string;
      ledger: number;
      data: { from: string; amount: string };
    }
  | {
      kind: 'transfer';
      contractId: string;
      ledger: number;
      data: { from: string; to: string; amount: string };
    }
  | {
      kind: 'approve';
      contractId: string;
      ledger: number;
      data: {
        owner: string;
        spender: string;
        amount: string;
        expirationLedger: number;
      };
    }
  | {
      kind: 'register';
      contractId: string;
      ledger: number;
      data: { id: string; name: string };
    }
  | {
      kind: 'update';
      contractId: string;
      ledger: number;
      data: { id: string };
    }
  | {
      kind: 'decommission';
      contractId: string;
      ledger: number;
      data: { id: string };
    }
  | {
      kind: 'fund';
      contractId: string;
      ledger: number;
      data: { from: string; amount: string };
    }
  | {
      kind: 'claim';
      contractId: string;
      ledger: number;
      data: { holder: string; amount: string };
    }
  | {
      kind: 'wrap';
      contractId: string;
      ledger: number;
      data: {
        chainId: number;
        sender: string;
        recipient: string;
        amount: string;
        nonce: number;
      };
    }
  | {
      kind: 'unwrap';
      contractId: string;
      ledger: number;
      data: {
        sender: string;
        chainId: number;
        recipient: string;
        amount: string;
        nonce: number;
      };
    }
  | {
      kind: 'vote';
      contractId: string;
      ledger: number;
      data: { proposalId: string; voter: string; choice: string };
    };

const TOPIC_KIND: Record<string, SolShareEventKind> = {
  [CONTRACT_EVENTS.Mint]: 'mint',
  [CONTRACT_EVENTS.Burn]: 'burn',
  [CONTRACT_EVENTS.Transfer]: 'transfer',
  [CONTRACT_EVENTS.Approve]: 'approve',
  [CONTRACT_EVENTS.Register]: 'register',
  [CONTRACT_EVENTS.Update]: 'update',
  [CONTRACT_EVENTS.Decommission]: 'decommission',
  [CONTRACT_EVENTS.Fund]: 'fund',
  [CONTRACT_EVENTS.Claim]: 'claim',
  [CONTRACT_EVENTS.Wrap]: 'wrap',
  [CONTRACT_EVENTS.Unwrap]: 'unwrap',
  // Governance emits a raw `vote` topic that isn't yet enumerated in
  // shared `CONTRACT_EVENTS`; accept it here so the discriminated union
  // can actually be reached.
  vote: 'vote',
};

const KIND_TO_TAG: Record<SolShareEventKind, keyof ContractTags> = {
  mint: 'rwaToken',
  burn: 'rwaToken',
  transfer: 'rwaToken',
  approve: 'rwaToken',
  register: 'registry',
  update: 'registry',
  decommission: 'registry',
  fund: 'yield',
  claim: 'yield',
  wrap: 'bridge',
  unwrap: 'bridge',
  vote: 'governance',
};

/**
 * Coerce an SCVal-ish event value into a primitive. Soroban RPC proxies
 * typically expose `value` as a JSON array of strings (address strkey,
 * bigint-as-string, …). This helper unwraps one level and returns the
 * first non-null entry of the expected type.
 */
function pullString(value: unknown, idx = 0): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) {
    // `noUncheckedIndexedAccess` widens this to `unknown | undefined`,
    // which the recursive call resolves (returning '' for nullish).
    return pullString(value[idx], 0);
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (typeof v === 'string') return v;
    }
  }
  return '';
}

function pullNumber(value: unknown, idx = 0): number {
  const s = pullString(value, idx);
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Decode a single Soroban event into a tagged-union `SolShareEvent`.
 * Returns `null` if the topic is not one of the known contract events
 * or if the event came from a contract that's not in the supplied
 * `ContractTags` allow-list.
 */
export function decodeEvent(
  event: SorobanEvent,
  tags: ContractTags = {},
): SolShareEvent | null {
  const topic = (event.topic ?? [])[0];
  if (!topic) return null;
  const kind = TOPIC_KIND[topic];
  if (!kind) return null;
  if (kind !== 'vote') {
    const expectedTag = KIND_TO_TAG[kind];
    const expectedContractId = tags[expectedTag];
    if (expectedContractId && expectedContractId !== event.contractId) {
      return null;
    }
  }
  const base = { contractId: event.contractId, ledger: event.ledger } as const;
  switch (kind) {
    case 'mint':
      return {
        ...base,
        kind: 'mint',
        data: {
          to: pullString(event.value, 0),
          amount: pullString(event.value, 1),
        },
      };
    case 'burn':
      return {
        ...base,
        kind: 'burn',
        data: {
          from: pullString(event.value, 0),
          amount: pullString(event.value, 1),
        },
      };
    case 'transfer':
      return {
        ...base,
        kind: 'transfer',
        data: {
          from: pullString(event.value, 0),
          to: pullString(event.value, 1),
          amount: pullString(event.value, 2),
        },
      };
    case 'approve':
      return {
        ...base,
        kind: 'approve',
        data: {
          owner: pullString(event.value, 0),
          spender: pullString(event.value, 1),
          amount: pullString(event.value, 2),
          expirationLedger: pullNumber(event.value, 3),
        },
      };
    case 'register':
      return {
        ...base,
        kind: 'register',
        data: {
          id: pullString(event.value, 0),
          name: pullString(event.value, 1),
        },
      };
    case 'update':
      return {
        ...base,
        kind: 'update',
        data: { id: pullString(event.value, 0) },
      };
    case 'decommission':
      return {
        ...base,
        kind: 'decommission',
        data: { id: pullString(event.value, 0) },
      };
    case 'fund':
      return {
        ...base,
        kind: 'fund',
        data: {
          from: pullString(event.value, 0),
          amount: pullString(event.value, 1),
        },
      };
    case 'claim':
      return {
        ...base,
        kind: 'claim',
        data: {
          holder: pullString(event.value, 0),
          amount: pullString(event.value, 1),
        },
      };
    case 'wrap':
      return {
        ...base,
        kind: 'wrap',
        data: {
          chainId: pullNumber(event.value, 0),
          sender: pullString(event.value, 1),
          recipient: pullString(event.value, 2),
          amount: pullString(event.value, 3),
          nonce: pullNumber(event.value, 4),
        },
      };
    case 'unwrap':
      return {
        ...base,
        kind: 'unwrap',
        data: {
          sender: pullString(event.value, 0),
          chainId: pullNumber(event.value, 1),
          recipient: pullString(event.value, 2),
          amount: pullString(event.value, 3),
          nonce: pullNumber(event.value, 4),
        },
      };
    case 'vote':
      return {
        ...base,
        kind: 'vote',
        data: {
          proposalId: pullString(event.value, 0),
          voter: pullString(event.value, 1),
          choice: pullString(event.value, 2),
        },
      };
  }
}

/** Decode a batch of Soroban events, skipping anything unrecognised. */
export function decodeEvents(
  events: SorobanEvent[],
  tags: ContractTags = {},
): SolShareEvent[] {
  const out: SolShareEvent[] = [];
  for (const event of events) {
    const decoded = decodeEvent(event, tags);
    if (decoded) out.push(decoded);
  }
  return out;
}
