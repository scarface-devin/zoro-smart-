import { NetworkError } from '@solshare/shared';

export interface SorobanEvent {
  type: 'contract';
  ledger: number;
  contractId: string;
  topic: string[];
  value: unknown;
  pagingToken: string;
}

/**
 * Minimal Soroban JSON-RPC client. For a production deployment you would
 * use the official @stellar/stellar-sdk `Server` from
 * `rpc.Server`; this client exposes only the endpoints we use.
 */
export class SorobanClient {
  constructor(public readonly rpcUrl: string) {}

  async getLedger(sequence: number) {
    return this.rpc<{
      id: string;
      sequence: number;
      protocolVersion: string;
      ledgerCloseTime: string;
    }>('getLedger', { sequence });
  }

  async getEvents(opts: {
    startLedger: number;
    endLedger?: number;
    contractIds?: string[];
    topics?: string[];
    limit?: number;
  }) {
    return this.rpc<{
      events: SorobanEvent[];
      latestLedger: number;
    }>('getEvents', opts);
  }

  async getTransaction(hash: string) {
    return this.rpc<{
      status: 'SUCCESS' | 'FAILED' | 'NOT_FOUND';
      latestLedger: number;
      latestLedgerCloseTime: string;
      oldestLedger: number;
      oldestLedgerCloseTime: string;
      envelopeXdr: string;
      resultXdr: string;
      resultMetaXdr: string;
    }>('getTransaction', { hash });
  }

  /**
   * Simulate a transaction envelope (base64-encoded `TransactionEnvelope` XDR).
   * Returns the Soroban simulation result.
   */
  async simulateTransaction(transactionEnvelopeBase64: string) {
    return this.rpc<{
      transactionData: string;
      minResourceFee: string;
      cost: { cpuInsns: string; memBytes: string };
      results: Array<{ auth?: string[]; xdr: string }>;
      latestLedger: number;
    }>('simulateTransaction', { transaction: transactionEnvelopeBase64 });
  }

  async sendTransaction(transactionEnvelopeBase64: string) {
    return this.rpc<{
      status: 'PENDING' | 'DUPLICATE' | 'TRY_AGAIN_LATER' | 'ERROR';
      hash: string;
      latestLedger: number;
    }>('sendTransaction', { transaction: transactionEnvelopeBase64 });
  }

  private async rpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!res.ok) {
      throw new NetworkError(`Soroban RPC returned ${res.status}`);
    }
    const body = (await res.json()) as { result?: T; error?: { message: string; code: number } };
    if (body.error) {
      throw new NetworkError(`Soroban RPC error: ${body.error.message} (${body.error.code})`);
    }
    if (!body.result) throw new NetworkError('Soroban RPC returned empty result');
    return body.result;
  }
}
