import { ContractClient, type ContractClientOptions } from './contract-client.js';
import type { SimulationAccount } from '../simulation-account.js';

export class RwaTokenContract {
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

  async readTotalSupply(): Promise<string> {
    return this.client.read<string>('total_supply');
  }

  async readBalance(account: string): Promise<string> {
    return this.client.read<string>('balance', { account });
  }

  async readAllowance(owner: string, spender: string): Promise<string> {
    return this.client.read<string>('allowance', { owner, spender });
  }

  async readMetadata() {
    const [name, symbol, decimals] = await Promise.all([
      this.client.read<string>('name'),
      this.client.read<string>('symbol'),
      this.client.read<number>('decimals'),
    ]);
    return { name, symbol, decimals: Number(decimals) };
  }

  buildTransfer(from: string, to: string, amount: string) {
    return this.client.buildWrite('transfer', { from, to, amount });
  }

  buildApprove(
    owner: string,
    spender: string,
    amount: string,
    expirationLedger: number,
  ) {
    return this.client.buildWrite('approve', {
      owner,
      spender,
      amount,
      expiration_ledger: expirationLedger,
    });
  }

  buildMint(to: string, amount: string) {
    return this.client.buildWrite('mint', { to, amount });
  }

  buildBurn(from: string, amount: string) {
    return this.client.buildWrite('burn', { from, amount });
  }
}

export type { ContractClientOptions };
