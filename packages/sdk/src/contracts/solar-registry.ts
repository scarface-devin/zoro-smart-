import { ContractClient } from './contract-client.js';
import type { SimulationAccount } from '../simulation-account.js';
import type { SolarArraySummary } from '@solshare/shared';

export class SolarRegistryContract {
  private readonly client: ContractClient;
  readonly contractId: string;

  constructor(
    contractId: string,
    sorobanRpcUrl: string,
    networkPassphrase: string,
    simulationAccount: SimulationAccount,
  ) {
    this.contractId = contractId;
    this.client = new ContractClient({
      contractId,
      sorobanRpcUrl,
      networkPassphrase,
      simulationAccount,
    });
  }

  /** Swap the source account for every read on this contract. */
  setSimulationAccount(account: SimulationAccount): void {
    this.client.setSimulationAccount(account);
  }

  async count(): Promise<number> {
    const out = await this.client.read<number>('count_arrays');
    return Number(out);
  }

  async listAllIds(): Promise<string[]> {
    return this.client.read<string[]>('list_arrays');
  }

  async getArray(id: string): Promise<SolarArraySummary | null> {
    if (!this.contractId) return null;
    try {
      const out = (await this.client.read<SolarArraySummary>('get_array', { id })) as SolarArraySummary;
      return out;
    } catch {
      return null;
    }
  }

  async getAllArrays(): Promise<SolarArraySummary[]> {
    const ids = await this.listAllIds();
    const settled = await Promise.all(ids.map((id) => this.getArray(id)));
    return settled.filter((x): x is SolarArraySummary => Boolean(x));
  }

  buildStatusTransition(
    id: string,
    status: 'Active' | 'Maintenance' | 'Decommissioned',
  ) {
    return this.client.buildWrite('set_status', { id, status });
  }

  buildBindToken(id: string, tokenContract: string) {
    return this.client.buildWrite('bind_token', { id, token_contract: tokenContract });
  }
}
