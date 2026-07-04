/**
 * Soroban simulation account management.
 *
 * `simulateTransaction` does not require a signed envelope, but the RPC
 * still needs to look the source account up to compute fees and check
 * sequence numbers. The well-known zero key (`GAAAA…` / seq `0`) used in
 * the scaffold is rejected by every public Soroban RPC with
 * `MissingAccount` (or `BadSourceAccount`), which is why every dashboard
 * read was throwing.
 *
 * `SimulationAccount` is a tiny wrapper around a Stellar `Account` that
 * also retains the secret key (when we generated the keypair ourselves)
 * so it can be funded via Friendbot. It's held by-reference and passed
 * to every `ContractClient` instance so `setSimulationAccount` on
 * `SolShareClient` propagates to all four contract wrappers at once.
 */

import { Account, Keypair } from '@stellar/stellar-sdk';

export interface SimulationAccountOptions {
  /** Strkey-encoded account address (G…). */
  publicKey: string;
  /**
   * Strkey-encoded secret seed (S…). Only present when the SDK itself
   * generated the keypair; user-provided accounts that only supply a
   * public key can still be used for simulation but cannot be funded.
   */
  secretKey?: string;
  /**
   * Sequence number. The Soroban RPC does not bump it during a read-only
   * simulation, so `0` is the right default for any new account.
   */
  sequenceNumber?: string;
}

/**
 * Mutable holder of the source account used by every read-only
 * `simulateTransaction` call. Mutations are visible to all
 * `ContractClient` instances that share a reference, which is how
 * `SolShareClient.setSimulationAccount` propagates to all four contract
 * wrappers at once.
 */
export class SimulationAccount {
  private _account: Account;
  private _secretKey: string | undefined;

  constructor(opts: SimulationAccountOptions) {
    this._account = new Account(opts.publicKey, opts.sequenceNumber ?? '0');
    this._secretKey = opts.secretKey;
  }

  /** The Stellar `Account` used as the source for every `simulateTransaction`. */
  get account(): Account {
    return this._account;
  }

  /** Convenience accessor for the strkey public key. */
  get publicKey(): string {
    return this._account.accountId();
  }

  /** Strkey secret seed; undefined if the account was provided without one. */
  get secretKey(): string | undefined {
    return this._secretKey;
  }

  /**
   * Replace the source account. Pass `secretKey` to allow subsequent
   * `fundSimulationAccount` calls; omit it for read-only simulation
   * against an externally-managed account.
   */
  set(opts: SimulationAccountOptions): void {
    this._account = new Account(opts.publicKey, opts.sequenceNumber ?? '0');
    this._secretKey = opts.secretKey;
  }

  /** Generate a fresh ed25519 keypair. */
  static random(): SimulationAccount {
    const kp = Keypair.random();
    return new SimulationAccount({ publicKey: kp.publicKey(), secretKey: kp.secret() });
  }
}

/**
 * Friendbot funding helper. Only available on TESTNET and FUTURENET; on
 * PUBLIC (mainnet) the caller must fund the account themselves.
 *
 * Returns the parsed Friendbot JSON response. Throws on network or HTTP
 * failure so callers can fall back gracefully (e.g. log a warning and
 * continue with an unfunded account).
 */
export async function fundSimulationAccount(
  account: SimulationAccount,
  network: 'TESTNET' | 'FUTURENET',
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  if (!account.secretKey) {
    throw new Error(
      'Cannot fund a simulation account that was provided without a secret key — pass the secret via setSimulationAccount() to enable funding',
    );
  }
  // The URL is hardcoded per Stellar's public Friendbot endpoints.
  const base =
    network === 'FUTURENET'
      ? 'https://friendbot-futurenet.stellar.org'
      : 'https://friendbot.stellar.org';
  const url = `${base}?addr=${encodeURIComponent(account.publicKey)}`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Friendbot funding failed (${res.status}): ${text}`);
  }
  return res.json();
}
