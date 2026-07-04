import { NetworkError } from '@solshare/shared';

/**
 * Thin wrapper over Stellar Horizon REST endpoints. Avoids many bells &
 * whistles — exposes the surface used by the SolShare UI/dashboard.
 */
export class HorizonClient {
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

  private async get<T>(path: string, attempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(this.horizonUrl + path, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          const body = await res.text();
          throw new NetworkError(`Horizon returned ${res.status}: ${body}`);
        }
        return (await res.json()) as T;
      } catch (e) {
        lastErr = e;
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 2 ** i * 200));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new NetworkError('Horizon request failed');
  }
}
