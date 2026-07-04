/**
 * Shared Contract invocation helpers used by every SDK wrapper.
 *
 * The wrappers in this directory all use these helpers so behaviour is
 * consistent: every read goes through a `simulateTransaction` call (which
 * does not require a signed envelope), and every write prepares a fully
 * formed `Contract.invokeHostFunction` operation that the caller can sign
 * with their wallet (Freighter / Lobster / etc.)
 */

import {
  Contract,
  TransactionBuilder,
  Account,
  Address,
  nativeToScVal,
  scValToNative,
  Networks,
  type xdr,
} from '@stellar/stellar-sdk';
// The Soroban RPC client is published under a dedicated subpath export
// (`@stellar/stellar-sdk/rpc`) so consumers can import only the network
// code without dragging in Horizon helpers.
import { Server as SorobanRpcServer } from '@stellar/stellar-sdk/rpc';

export interface ContractClientOptions {
  /** Contract id (C-...). */
  contractId: string;
  /** Soroban RPC URL. */
  sorobanRpcUrl: string;
  /** Network passphrase. */
  networkPassphrase: string;
}

interface SimulationResult {
  result?: { retval?: xdr.ScVal };
  errorResult?: unknown;
}

/**
 * Low-level client around a single Soroban contract. SDK wrappers compose
 * these into typed APIs.
 */
export class ContractClient {
  readonly contract: Contract | null;
  readonly contractId: string;
  readonly networkPassphrase: string;
  private readonly rpc: SorobanRpcServer;

  constructor(opts: ContractClientOptions) {
    this.contractId = opts.contractId;
    this.contract = opts.contractId ? new Contract(opts.contractId) : null;
    this.networkPassphrase = opts.networkPassphrase;
    this.rpc = new SorobanRpcServer(opts.sorobanRpcUrl, {
      allowHttp: opts.sorobanRpcUrl.startsWith('http://'),
    });
  }

  /** Throws a clear error if the contract id was never bound. */
  requireContract(): Contract {
    if (!this.contract) {
      throw new Error('contract id not bound — set it on SolShareClient.contracts');
    }
    return this.contract;
  }

  /**
   * Simulate a read-only call to `method(args)`. Returns the decoded native
   * JS value (the Soroban SDK handles XDR→native conversion for the common
   * primitives; for custom contract types callers should pass a parser).
   */
  async read<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    if (!method) throw new Error('method is required');
    const contract = this.requireContract();
    const source = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '0');
    const params = Object.values(args).map((v) => encodeValue(v));
    const tx = new TransactionBuilder(source, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...params))
      .setTimeout(30)
      .build();
    const sim = (await this.rpc.simulateTransaction(tx)) as SimulationResult;
    const retval = sim.result?.retval as xdr.ScVal | undefined;
    if (retval) {
      return scValToNative(retval) as T;
    }
    throw new Error(`Soroban simulation failed: ${JSON.stringify(sim)}`);
  }

  /**
   * Build an unsigned `Operation` for a write call. The caller wraps this
   * in a Transaction, signs it (Freighter), and submits it to the RPC.
   */
  buildWrite(method: string, args: Record<string, unknown> = {}): xdr.Operation {
    const contract = this.requireContract();
    const params = Object.values(args).map((v) => encodeValue(v));
    return contract.call(method, ...params) as xdr.Operation;
  }

  /** Resolve a network passphrase by short name. */
  static passphraseFor(network: 'PUBLIC' | 'TESTNET' | 'FUTURENET' | 'STANDALONE'): string {
    return Networks[network] ?? '';
  }
}

/**
 * Encode a JS value into the SCVal form the Soroban host expects.
 * - `G…` strkey strings → ScvAddress.
 * - 64-char hex strings → ScvBytes (BytesN<32>).
 * - everything else → falls through to `nativeToScVal`.
 */
function encodeValue(v: unknown): xdr.ScVal {
  if (typeof v === 'string') {
    if (/^G[A-Z2-7]{55}$/.test(v)) {
      return nativeToScVal(new Address(v));
    }
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(v)) {
      const hex = v.startsWith('0x') ? v.slice(2) : v;
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      return nativeToScVal(bytes);
    }
  }
  return nativeToScVal(v as Parameters<typeof nativeToScVal>[0]);
}
