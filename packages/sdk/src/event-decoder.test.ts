import { describe, it, expect } from 'vitest';
import { decodeEvent, decodeEvents } from '../src/event-decoder.js';
import { CONTRACT_EVENTS } from '@solshare/shared';
import type { SorobanEvent } from '../src/soroban.js';

function makeEvent(opts: {
  topic: string;
  contractId: string;
  value?: unknown;
  ledger?: number;
}): SorobanEvent {
  return {
    type: 'contract',
    ledger: opts.ledger ?? 100,
    contractId: opts.contractId,
    topic: [opts.topic],
    value: opts.value ?? [],
    pagingToken: 'p',
  };
}

describe('decodeEvent', () => {
  it('decodes a transfer event from the rwa-token contract', () => {
    const out = decodeEvent(
      makeEvent({
        topic: CONTRACT_EVENTS.Transfer,
        contractId: 'rwaToken-addr',
        value: ['GAAAA', 'GBBBB', '1000'],
      }),
      { rwaToken: 'rwaToken-addr' },
    );
    expect(out?.kind).toBe('transfer');
    if (out?.kind === 'transfer') {
      expect(out.data.from).toBe('GAAAA');
      expect(out.data.to).toBe('GBBBB');
      expect(out.data.amount).toBe('1000');
      expect(out.contractId).toBe('rwaToken-addr');
      expect(out.ledger).toBe(100);
    }
  });

  it('decodes a register event from the registry', () => {
    const out = decodeEvent(
      makeEvent({
        topic: CONTRACT_EVENTS.Register,
        contractId: 'reg-addr',
        value: ['AaBb', 'Array-1'],
      }),
      { registry: 'reg-addr' },
    );
    expect(out?.kind).toBe('register');
    if (out?.kind === 'register') {
      expect(out.data.id).toBe('AaBb');
      expect(out.data.name).toBe('Array-1');
    }
  });

  it('decodes a wrap event', () => {
    const out = decodeEvent(
      makeEvent({
        topic: CONTRACT_EVENTS.Wrap,
        contractId: 'bridge-addr',
        value: [1, '0xsender', 'Grecipient', '5000', 42],
      }),
      { bridge: 'bridge-addr' },
    );
    expect(out?.kind).toBe('wrap');
    if (out?.kind === 'wrap') {
      expect(out.data.chainId).toBe(1);
      expect(out.data.sender).toBe('0xsender');
      expect(out.data.recipient).toBe('Grecipient');
      expect(out.data.amount).toBe('5000');
      expect(out.data.nonce).toBe(42);
    }
  });

  it('returns null on unknown topic', () => {
    const out = decodeEvent(
      makeEvent({ topic: 'somethingelse', contractId: 'a' }),
    );
    expect(out).toBeNull();
  });

  it('rejects events from wrong contract when tags are given', () => {
    const out = decodeEvent(
      makeEvent({
        topic: CONTRACT_EVENTS.Transfer,
        contractId: 'wrong-addr',
        value: ['GAAAA', 'GBBBB', '1000'],
      }),
      { rwaToken: 'rwaToken-addr' },
    );
    expect(out).toBeNull();
  });

  it('falls through unknown topics without crashing', () => {
    expect(
      decodeEvent({ type: 'contract', ledger: 1, contractId: 'a', topic: [], value: null, pagingToken: 'p' }),
    ).toBeNull();
  });
});

describe('decodeEvents', () => {
  it('filters out unknowns and contract-mismatched events', () => {
    const events = [
      makeEvent({ topic: 'unknown', contractId: 'a' }),
      makeEvent({
        topic: CONTRACT_EVENTS.Mint,
        contractId: 'rwa-x',
        value: ['GZZ', '500'],
      }),
      makeEvent({
        topic: CONTRACT_EVENTS.Mint,
        contractId: 'wrong',
        value: ['GZZ', '500'],
      }),
    ];
    const out = decodeEvents(events, { rwaToken: 'rwa-x' });
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe('mint');
  });
});
