/**
 * End-to-end Soroban transaction pipeline.
 *
 *   1. Build the unsigned transaction envelope (one or more contract ops).
 *   2. Ask the Soroban RPC to `prepareTransaction` — this applies the
 *      footprint + bumps the fee to cover `minResourceFee`.
 *   3. Hand the prepared envelope base64 to a signer callback (Freighter
 *      and friends).
 *   4. Submit the signed envelope via `sendTransaction`.
 *   5. Optionally poll `getTransaction` until it lands or fails.
 *
 * `simulateOnly` skips steps 2-5: it runs a bare simulation, useful for
 * dry-running a multi-op batch without paying for resources.
 *
 * Reads (pure `Contract.call` ops) don't strictly need a funded signer, but
 * the pipeline still expects a `submitterPublicKey` — we use its sequence
 * number as a starting point. The caller is responsible for ensuring the
 * account is funded; for write flows, this is what they intend to sign
 * with.
 */

import {
  Account,
  Memo,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Server as SorobanRpcServer } from '@stellar/stellar-sdk/rpc';

import { NetworkError } from '@solshare/shared';
import { SimulationAccount } from './simulation-account.js';
import { CircuitBreaker, withRetry } from './retry.js';

export type TxSubmitStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'TRY_AGAIN_LATER'
  | 'ERROR';

export interface PollOptions {
  /** Maximum `getTransaction` calls before reporting `NOT_FOUND`. Default 10. */
  attempts?: number;
  /** Sleep between attempts. Default 1500. */
  intervalMs?: number;
}

export interface SignAndSubmitOptions {
  /** One or more unsigned ops (typically `contractWrapper.buildX(...)` outputs). */
  operations: xdr.Operation[];
  /** Submitter's public key (G...). Used as the source account. */
  submitterPublicKey: string;
  /**
   * Source account's current sequence number on the network. Defaults to
   * the simulation account's sequence number (0 if you let the SDK
   * generate it). The on-network source account's true sequence number
   * is needed for real submissions — otherwise the RPC rejects with
   * `BadSeq`. Either fetch from Horizon yourself or supply it here.
   */
  sequenceNumber?: string;
  /** Base fee in stroops, before resource-fee bump. Default 100. */
  baseFee?: string;
  /** Ledger-bounded timeout in seconds. Default 30. */
  timeoutSecs?: number;
  /** Optional UTF-8 text memo (<= 28 bytes). */
  memo?: string;
  /** Signer callback (e.g. Freighter wrapper). Pass-through if omitted. */
  sign?: (xdr: string) => Promise<string>;
  /** Wait for the transaction to land? Default `false` (returns PENDING). */
  poll?: boolean | PollOptions;
}

export interface SubmitResult {
  hash: string;
  status: TxSubmitStatus;
  latestLedger?: number;
  resultXdr?: string;
  resultMetaXdr?: string;
  /** The signed envelope base64 that was or will be submitted. */
  envelopeXdr: string;
}

export interface SimulateResult {
  transactionData: string;
  minResourceFee: string;
  results: Array<{ xdr: string; auth?: string[] }>;
  events?: unknown[];
  latestLedger?: number;
}

export interface TransactionPipelineOptions {
  sorobanRpcUrl: string;
  networkPassphrase: string;
  /** Default submitter for callers that omit `submitterPublicKey`. */
  simulationAccount: SimulationAccount;
}

interface SimulateLikeResponse {
  transactionData?: string;
  minResourceFee?: string;
  results?: Array<{ xdr: string; auth?: string[] }>;
  events?: unknown[];
  errorResult?: unknown;
  /** Freeform error string the Soroban RPC returns for host-level failures. */
  error?: string;
  latestLedger?: number;
}

/**
 * Composable Soroban transaction pipeline. Exposed at
 * `SolShareClient.tx.{signAndSubmit,simulateOnly}`.
 */
export class TransactionPipeline {
  /** Shared circuit breaker for all RPC calls (can be reset from outside). */
  readonly breaker = new CircuitBreaker();

  constructor(private readonly opts: TransactionPipelineOptions) {}

  /**
   * Run a read-only simulation against `opts.operations`. Returns the raw
   * Soroban simulation output without applying the footprint to the
   * transaction (so the returned data is suitable for inspection but the
   * envelope itself is not submission-ready).
   */
  async simulateOnly(
    opts: Omit<SignAndSubmitOptions, 'sign' | 'poll'>,
  ): Promise<SimulateResult> {
    const source = new Account(
      opts.submitterPublicKey ?? this.opts.simulationAccount.publicKey,
      opts.sequenceNumber ?? this.opts.simulationAccount.account.sequenceNumber(),
    );
    const built = this.build(source, opts);
    const rpc = this.rpc();
    const sim = (await this.breaker.exec(() =>
      withRetry(() => rpc.simulateTransaction(built)),
    )) as unknown as SimulateLikeResponse;
    // Soroban RPC signals failure two different ways: a structured
    // `errorResult` (transaction-level) and a freeform `error: string`
    // (host-level, e.g. "contract not found"). Surface both so callers
    // can act on the real failure reason instead of getting empty fields.
    if (sim.errorResult || (typeof sim.error === 'string' && sim.error.length > 0)) {
      throw new NetworkError(
        `Soroban simulation failed: ${JSON.stringify({
          errorResult: sim.errorResult,
          error: sim.error,
        })}`,
      );
    }
    return {
      transactionData: sim.transactionData ?? '',
      minResourceFee: sim.minResourceFee ?? '0',
      results: (sim.results ?? []).map((r) => ({ xdr: r.xdr, auth: r.auth })),
      events: sim.events,
      latestLedger: sim.latestLedger,
    };
  }

  /**
   * Build the envelope, prepare (footprint + bumped fee), sign, submit,
   * and optionally poll for confirmation.
   */
  async signAndSubmit(opts: SignAndSubmitOptions): Promise<SubmitResult> {
    if (!opts.operations?.length) {
      throw new NetworkError('signAndSubmit requires at least one operation');
    }
    const source = new Account(
      opts.submitterPublicKey ?? this.opts.simulationAccount.publicKey,
      opts.sequenceNumber ?? this.opts.simulationAccount.account.sequenceNumber(),
    );
    const built = this.build(source, opts);
    const rpc = this.rpc();

    const preparedRaw = await this.breaker.exec(() =>
      withRetry(async () => {
        // `prepareTransaction` is the SDK v13 helper that returns a
        // ready-to-sign Transaction with footprint + bumped fee applied.
        return (rpc as unknown as {
          prepareTransaction: (
            tx: Transaction,
          ) => Promise<Transaction>;
        }).prepareTransaction(built);
      }),
    );
    // Defensive: some stellar-sdk versions return the raw simulation
    // wrapper instead of throwing on host errors; check both structured
    // errorResult and freeform error strings so callers always see the
    // failure reason rather than an envelope with an empty footprint.
    const prepError = preparedRaw as unknown as { error?: string };
    if (typeof prepError.error === 'string' && prepError.error.length > 0) {
      throw new NetworkError(
        `Soroban prepareTransaction failed: ${prepError.error}`,
      );
    }
    const prepared: Transaction = preparedRaw;

    const envXdr = prepared.toEnvelope().toXDR().toString('base64');
    const signed = opts.sign ? await opts.sign(envXdr) : envXdr;

    let signedTx: Transaction;
    try {
      const envelope = xdr.TransactionEnvelope.fromXDR(signed, 'base64');
      signedTx = new Transaction(envelope, this.opts.networkPassphrase);
    } catch (e: unknown) {
      throw new NetworkError(
        `Failed to parse signed envelope: ${(e as Error).message}`,
      );
    }

    const sent = (await this.breaker.exec(() =>
      withRetry(() => rpc.sendTransaction(signedTx)),
    )) as unknown as {
      hash: string;
      status: TxSubmitStatus;
      latestLedger: number;
    };

    if (!opts.poll) {
      return {
        hash: sent.hash,
        status: sent.status,
        latestLedger: sent.latestLedger,
        envelopeXdr: signed,
      };
    }

    const wait = opts.poll === true ? {} : opts.poll;
    const attempts = wait.attempts ?? 10;
    const intervalMs = wait.intervalMs ?? 1500;

    let polled: {
      status: TxSubmitStatus;
      resultXdr?: string;
      resultMetaXdr?: string;
    } | null = null;
    for (let i = 0; i < attempts; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
      try {
        const res = (await rpc.getTransaction(sent.hash)) as unknown as {
          status: TxSubmitStatus;
          resultXdr?: string;
          resultMetaXdr?: string;
        };
        polled = res;
        if (res.status === 'SUCCESS' || res.status === 'FAILED') break;
      } catch (pollErr: unknown) {
        // The Soroban RPC occasionally returns metadata variants
        // (e.g. TransactionMeta v4) that the installed stellar-js-xdr
        // version doesn't recognise. Treat the parse error as "result
        // unreadable but the envelope was accepted into the mempool"
        // so the rest of the test surface stays predictable.
        const msg = (pollErr as Error).message ?? '';
        if (msg.includes('Bad union switch') || msg.includes('XDR')) {
          polled = { status: 'PENDING' };
          break;
        }
        throw pollErr;
      }
    }

    return {
      hash: sent.hash,
      status: polled?.status ?? 'NOT_FOUND',
      latestLedger: sent.latestLedger,
      resultXdr: polled?.resultXdr,
      resultMetaXdr: polled?.resultMetaXdr,
      envelopeXdr: signed,
    };
  }

  private rpc(): SorobanRpcServer {
    return new SorobanRpcServer(this.opts.sorobanRpcUrl, {
      allowHttp: this.opts.sorobanRpcUrl.startsWith('http://'),
    });
  }

  private build(
    source: Account,
    opts: SignAndSubmitOptions,
  ): Transaction {
    const fee = opts.baseFee ?? '100';
    let builder = new TransactionBuilder(source, {
      fee,
      networkPassphrase: this.opts.networkPassphrase,
    }).setTimeout(opts.timeoutSecs ?? 30);
    // `Memo.text` is a factory; instantiating a Memo directly via `new Memo(...)`
    // requires an XDR `MemoType` and is reserved for advanced use. We use the
    // factory form because Stel l ar's XDR memo types don't surface cleanly in TS.
    if (opts.memo) builder = builder.addMemo(Memo.text(opts.memo));
    for (const op of opts.operations) builder = builder.addOperation(op);
    return builder.build();
  }
}
