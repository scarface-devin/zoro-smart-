/**
 * Live integration test for `TransactionPipeline` against the public
 * Stellar TESTNET. Drives the full lifecycle end-to-end:
 *
 *   build -> `rpc.prepareTransaction` (footprint + bumped fee) ->
 *   sign (in-process via Keypair) -> `rpc.sendTransaction` ->
 *   `rpc.getTransaction` polling
 *
 * Real network interaction steps:
 *   1. Friendbot funds a freshly generated keypair via
 *      `SimulationAccount` + `fundSimulationAccount`.
 *   2. Horizon `/accounts/<addr>` for the on-network sequence number.
 *   3. Soroban RPC `prepareTransaction` for the Native XLM Stellar Asset
 *      Contract's read-only `name()` method (no auth required).
 *   4. The signed envelope is posted to the Soroban mempool via
 *      `rpc.sendTransaction`.
 *   5. The pipeline polls `rpc.getTransaction` until the result lands.
 *
 * Gated on `RUN_LIVE_TESTS !== '1'` so CI doesn't hit the network by
 * default. Enable with:
 *
 *   RUN_LIVE_TESTS=1 pnpm --filter @solshare/sdk test
 *
 * Override endpoints with `TESTNET_HORIZON_URL` and
 * `TESTNET_SOROBAN_RPC` if you need to point at a local standalone
 * network.
 */

import { describe, it, expect } from 'vitest';
import {
  Contract,
  Keypair,
  Transaction,
  xdr,
} from '@stellar/stellar-sdk';

import { SimulationAccount, fundSimulationAccount } from './simulation-account.js';
import { TransactionPipeline } from './transaction-pipeline.js';
import { withRetry } from './retry.js';

const HORIZON_URL =
  process.env.TESTNET_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const RPC_URL =
  process.env.TESTNET_SOROBAN_RPC ?? 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const LIVE = process.env.RUN_LIVE_TESTS === '1';
// Native XLM Stellar Asset Contract on testnet. The address is
// deterministic from the network passphrase + asset identifier, so it is
// stable across testnet restarts and does not require user auth for
// read-only calls like `name()`.
const XLM_SAC_TESTNET =
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 1500;

async function fetchWithRetry(
  url: string,
  attempts = 10,
  initialDelayMs = 1_000,
): Promise<Response> {
  return withRetry(
    async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`fetch ${url} failed: ${res.status}`);
      }
      return res;
    },
    {
      attempts,
      initialDelayMs,
      shouldRetry: (err: unknown) => {
        if (!(err instanceof Error)) return false;
        const m = err.message;
        return (
          m.includes('404') || m.includes('500') || m.includes('502') || m.includes('503')
        );
      },
    },
  );
}

describe.skipIf(!LIVE)(
  'TransactionPipeline live testnet integration',
  () => {
    it(
      'runs prepare -> sign -> send -> poll against the public Soroban testnet',
      async () => {
        // 1. Generate a fresh signer, funded through Friendbot. Friendbot
        //    rate-limits occasionally, so wrap in withRetry.
        const account = SimulationAccount.random();
        if (!account.secretKey) {
          throw new Error(
            'SimulationAccount.random() must return a keypair with a secret',
          );
        }
        await withRetry(
          async () => fundSimulationAccount(account, 'TESTNET'),
          { attempts: 3, initialDelayMs: 2_000, factor: 2 },
        );

        // 2. Poll Horizon until the funded account appears. Friendbot
        //    funding typically propagates within ~5 s but can be slower.
        const acctRes = await fetchWithRetry(
          `${HORIZON_URL}/accounts/${account.publicKey}`,
          15,
          2_000,
        );
        const acctJson = (await acctRes.json()) as { sequence: string };
        const sequenceNumber = acctJson.sequence;

        // 3. Wire the pipeline to public Soroban testnet RPC.
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

        // 5. Read-only `name()` call on the native XLM SAC. No args, no
        //    auth required; survives a successful end-to-end pipeline
        //    pass without pre-existing trustlines.
        const op = new Contract(XLM_SAC_TESTNET).call('name');

        // 6. Drive the full prepare -> sign -> send -> poll pipeline.
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

        // 7. Validate envelope + status. Only SUCCESS proves a clean
        //    lifecycle (PENDING/FAILED likely indicate BadSeq, auth,
        //    or other SDK regressions, so we surface them loudly).
        expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
        expect(result.envelopeXdr.length).toBeGreaterThan(0);
        if (result.status !== 'SUCCESS') {
          throw new Error(
            `Expected SUCCESS after the full lifecycle, got status=${result.status} hash=${result.hash}`,
          );
        }
      },
      // Friendbot (with backoff) + 30 polls × 1.5 s + RPC overhead.
      180_000,
    );
  },
);
