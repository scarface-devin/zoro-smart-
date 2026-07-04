import { ContractClient } from './contract-client.js';
import type { SimulationAccount } from '../simulation-account.js';

export interface DepositMessageInput {
  chainId: number;
  sourceTxHash: string;
  sourceToken: string;
  sender: string;
  recipient: string;
  amount: string;
  nonce: number;
}

export interface SolverSignatureInput {
  validator: string;
  signature: string;
}

export class BridgeWrapperContract {
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

  async getValidators(chainId: number): Promise<string[]> {
    return this.client.read<string[]>('get_validators', { chain_id: chainId });
  }

  async getThreshold(chainId: number): Promise<number> {
    const out = await this.client.read<number>('get_threshold', { chain_id: chainId });
    return Number(out);
  }

  buildWrap(deposit: DepositMessageInput, signatures: SolverSignatureInput[]) {
    return this.client.buildWrite('wrap', {
      deposit: {
        chain_id: deposit.chainId,
        source_tx_hash: deposit.sourceTxHash,
        source_token: deposit.sourceToken,
        sender: deposit.sender,
        recipient: deposit.recipient,
        amount: deposit.amount,
        nonce: deposit.nonce,
      },
      signatures,
    });
  }

  buildUnwrap(sender: string, request: { chainId: number; recipient: string; amount: string; nonce: number }) {
    return this.client.buildWrite('unwrap', {
      sender,
      request: {
        chain_id: request.chainId,
        recipient: request.recipient,
        amount: request.amount,
        nonce: request.nonce,
      },
    });
  }
}
