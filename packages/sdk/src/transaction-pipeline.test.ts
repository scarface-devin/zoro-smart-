import { describe, it, expect, vi } from 'vitest';
import { TransactionPipeline } from '../src/transaction-pipeline.js';
import { SimulationAccount } from '../src/simulation-account.js';

function newPipeline(): TransactionPipeline {
  return new TransactionPipeline({
    sorobanRpcUrl: 'http://localhost:8000/soroban/rpc',
    networkPassphrase: 'Test SDF Network ; September 2015',
    simulationAccount: SimulationAccount.random(),
  });
}

describe('TransactionPipeline', () => {
  it('starts with a closed circuit breaker', () => {
    expect(newPipeline().breaker.current()).toBe('closed');
  });

  it('rejects signAndSubmit with no operations', async () => {
    await expect(
      newPipeline().signAndSubmit({
        operations: [],
        submitterPublicKey: 'G' + 'A'.repeat(55),
      }),
    ).rejects.toThrow('at least one operation');
  });

  it('rejects signAndSubmit when the source account is malformed', async () => {
    // We don't try to exercise a full envelope round-trip here — that
    // requires constructing a real signed Transaction, which is more
    // meaningful as an integration test against a live RPC. Instead we
    // assert that an obviously-bad source account surfaces a rejection
    // rather than silently building an invalid transaction.
    await expect(
      newPipeline().signAndSubmit({
        operations: [{} as never],
        submitterPublicKey: 'not-a-valid-stellar-address',
        sign: async (x) => x,
        poll: false,
      }),
    ).rejects.toBeDefined();
  });
});
