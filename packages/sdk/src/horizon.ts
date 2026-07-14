import { NetworkError } from '@solshare/shared';
import { CircuitBreaker, withRetry } from './retry.js';

/**
 * Thin wrapper over Stellar Horizon REST endpoints. Avoids many bells &
 * whistles — exposes the surface used by the SolShare UI/dashboard.
 *
 * Each request is routed through a `CircuitBreaker` + `withRetry`, so a
 * misbehaving Horizon stops being hammered without surfacing the same
 * error to every caller.
 */
export class HorizonClient {
  /** Exposed so callers can share a single breaker across sub-clients. */
  readonly breaker = new CircuitBreaker();

  constructor(public readonly horizonUrl: string) {}

  async serverInfo() {
    return this.get<{
      horizon_version: string;
      core_latest_ledger: number;
      network_passphrase: string;
      current_protocol_version: string;
    }>('/');
  }

  async account(publicKey: string) {
    return this.get<{
      account_id: string;
      sequence: string;
      balances: Array<{
        balance: string;
        asset_type: string;
        asset_code?: string;
        asset_issuer?: string;
      }>;
    }>(`/accounts/${publicKey}`);
  }

  async payments(publicKey: string, opts: { limit?: number; cursor?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.cursor) params.set('cursor', opts.cursor);
    const q = params.toString();
    return this.get<{
      _embedded: {
        records: Array<{
          id: string;
          paging_token: string;
          type: string;
          from?: string;
          to?: string;
          amount?: string;
          asset_type?: string;
          asset_code?: string;
          created_at: string;
          transaction_hash: string;
        }>;
      };
    }>(`/accounts/${publicKey}/payments${q ? '?' + q : ''}`);
  }

  async tx(hash: string) {
    return this.get<{
      hash: string;
      ledger: number;
      created_at: string;
      operation_count: number;
      envelope_xdr: string;
      result_xdr: string;
    }>(`/transactions/${hash}`);
  }

  private async get<T>(path: string): Promise<T> {
    return this.breaker.exec(() =>
      withRetry(async () => {
        const res = await fetch(this.horizonUrl + path, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          const body = await res.text();
          throw new NetworkError(`Horizon returned ${res.status}: ${body}`);
        }
        return (await res.json()) as T;
      }),
    );
  }
}
