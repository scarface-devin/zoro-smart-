import { ContractClient } from './contract-client.js';
import type { SimulationAccount } from '../simulation-account.js';

export class YieldDistributorContract {
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

  async yieldPerShare(): Promise<string> {
    return this.client.read<string>('yield_per_share');
  }

  async claimable(holder: string): Promise<string> {
    return this.client.read<string>('claimable', { holder });
  }

  async lastFundedAt(): Promise<number> {
    const out = await this.client.read<number>('last_funded_at');
    return Number(out);
  }

  buildFund(from: string, amount: string) {
    return this.client.buildWrite('fund', { from, amount });
  }

  buildClaim(holder: string) {
    return this.client.buildWrite('claim', { holder });
  }
}
