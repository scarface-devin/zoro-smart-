/**
 * Live integration test for `TransactionPipeline` against the public
 * Stellar TESTNET. Exercises the full lifecycle:
 *
 *   build envelope -> `rpc.prepareTransaction` (footprint + bumped fee) ->
 *   sign with a hot-loaded `Keypair` -> `rpc.sendTransaction` ->
 *   `rpc.getTransaction` polling
 *
 * Gated on `RUN_LIVE_TESTS !== '1'` so CI doesn't hit the network by
 * default. Enable with:
 *
 *   RUN_LIVE_TESTS=1 pnpm --filter @solshare/sdk test
 *
 * Override endpoints with `TESTNET_HORIZON_URL` and
 * `TESTNET_SOROBAN_RPC` if you need to point at a local standalone
 * network or a custom RPC.
 */

import { describe, it, expect } from 'vitest';
import {
  Keypair,
  Operation,
  Transaction,
  xdr,
} from '@stellar/stellar-sdk';

import { SimulationAccount, fundSimulationAccount } from '../src/simulation-account.js';
import { TransactionPipeline } from '../src/transaction-pipeline.js';

const HORIZON_URL =
  process.env.TESTNET_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const RPC_URL =
  process.env.TESTNET_SOROBAN_RPC ?? 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const LIVE = process.env.RUN_LIVE_TESTS === '1';
const POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 1500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe.skipIf(!LIVE)(
  'TransactionPipeline live testnet integration',
  () => {
    it(
      'drives prepare -> sign -> send -> poll against Soroban testnet',
      async () => {
        // 1. Generate a fresh signer, funded through Friendbot.
        const account = SimulationAccount.random();
        if (!account.secretKey) {
          throw new Error(
            'SimulationAccount.random() must return a keypair with a secret',
          );
        }
        await fundSimulationAccount(account, 'TESTNET');
        // Friendbot funding typically takes ~5s to propagate on testnet.
        await wait(5_000);

        // 2. Pull the actual on-network sequence number from Horizon so
        //    the RPC doesn't reject the submitted transaction with BadSeq.
        const acctRes = await fetch(
          `${HORIZON_URL}/accounts/${account.publicKey}`,
        );
        expect(acctRes.ok).toBe(true);
        const acctJson = (await acctRes.json()) as { sequence: string };
        const sequenceNumber = acctJson.sequence;

        // 3. Wire up the pipeline against the public Soroban testnet RPC.
        const pipeline = new TransactionPipeline({
          sorobanRpcUrl: RPC_URL,
          networkPassphrase: NETWORK_PASSPHRASE,
          simulationAccount: account,
        });

        // 4. Signer that bypasses Freighter by signing the prepared
        //    envelope in-process with the freshly generated keypair.
        const keypair = Keypair.fromSecret(account.secretKey);
        const sign = async (xdrBase64: string): Promise<string> => {
          const env = xdr.TransactionEnvelope.fromXDR(xdrBase64, 'base64');
          const t = new Transaction(env, NETWORK_PASSPHRASE);
          t.sign(keypair);
          return t.toEnvelope().toXDR().toString('base64');
        };

        // 5. A benign classic op — setOptions.homeDomain — that exercises
        //    a real write path without requiring a Soroban contract.
        const op = Operation.setOptions({ homeDomain: 'solshare.dev' });

        // 6. Drive prepare -> sign -> send -> poll.
        const result = await pipeline.signAndSubmit({
          operations: [op],
          submitterPublicKey: account.publicKey,
          sequenceNumber,
          sign,
          poll: {
            attempts: POLL_ATTEMPTS,
            intervalMs: POLL_INTERVAL_MS,
          },
        });

        // 7. Validate the envelope shape + status.
        expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
        expect(result.envelopeXdr.length).toBeGreaterThan(0);
        expect(['SUCCESS', 'PENDING']).toContain(result.status);

        if (result.status === 'SUCCESS') {
          expect(result.resultXdr).toBeTruthy();
        }
      },
      // Friendbot wait (5s) + 30 polling attempts at 1.5s each + RPC overhead.
      90_000,
    );
  },
);
