import { ContractClient } from './contract-client.js';
import type { SimulationAccount } from '../simulation-account.js';
import type { xdr } from '@stellar/stellar-sdk';

/**
 * Generic SEP-41 token wrapper for any contract id. Useful when you need
 * to inspect a token returned by another contract (e.g. the wrapped SAC
 * address that `bridgeWrapper.getWrappedToken(chainId, sourceToken)`
 * returns, or any third-party token issued on Soroban).
 *
 * Unlike `RwaTokenContract`, which is bound to a single RWA share-token
 * address passed at construction time, `TokensClient` takes the contract
 * id on every call. This keeps the wrapper stateless w.r.t. which token
 * it's interacting with — exactly the behaviour you want when joining
 * tokens with arbitrary upstream lookups.
 */
export class TokensClient {
  constructor(
    private readonly opts: {
      sorobanRpcUrl: string;
      networkPassphrase: string;
      simulationAccount: SimulationAccount;
    },
  ) {}

  /** Read `name`, `symbol`, `decimals` in parallel. */
  async readMetadata(
    contractId: string,
  ): Promise<{ name: string; symbol: string; decimals: number }> {
    if (!contractId) throw new Error('contractId is required');
    const [name, symbol, decimals] = await Promise.all([
      this.read<string>(contractId, 'name'),
      this.read<string>(contractId, 'symbol'),
      this.read<number>(contractId, 'decimals'),
    ]);
    return { name, symbol, decimals: Number(decimals) };
  }

  readTotalSupply(contractId: string): Promise<string> {
    return this.read<string>(contractId, 'total_supply');
  }

  readBalance(contractId: string, account: string): Promise<string> {
    return this.read<string>(contractId, 'balance', { account });
  }

  readAllowance(
    contractId: string,
    owner: string,
    spender: string,
  ): Promise<string> {
    return this.read<string>(contractId, 'allowance', { owner, spender });
  }

  readPaused(contractId: string): Promise<boolean> {
    return this.read<boolean>(contractId, 'paused');
  }

  readAdmin(contractId: string): Promise<string> {
    return this.read<string>(contractId, 'admin');
  }

  // --- Builders ---

  buildTransfer(
    contractId: string,
    from: string,
    to: string,
    amount: string,
  ): xdr.Operation {
    return this.write(contractId, 'transfer', { from, to, amount });
  }

  buildApprove(
    contractId: string,
    owner: string,
    spender: string,
    amount: string,
    expirationLedger: number,
  ): xdr.Operation {
    return this.write(contractId, 'approve', {
      owner,
      spender,
      amount,
      expiration_ledger: expirationLedger,
    });
  }

  buildBurn(contractId: string, from: string, amount: string): xdr.Operation {
    return this.write(contractId, 'burn', { from, amount });
  }

  buildBurnFrom(
    contractId: string,
    spender: string,
    owner: string,
    amount: string,
  ): xdr.Operation {
    return this.write(contractId, 'burn_from', {
      spender,
      from: owner,
      amount,
    });
  }

  buildTransferFrom(
    contractId: string,
    spender: string,
    owner: string,
    to: string,
    amount: string,
  ): xdr.Operation {
    return this.write(contractId, 'transfer_from', {
      spender,
      from: owner,
      to,
      amount,
    });
  }

  buildTransferBatch(
    contractId: string,
    from: string,
    recipients: string[],
    amounts: string[],
  ): xdr.Operation {
    return this.write(contractId, 'transfer_batch', {
      from,
      recipients,
      amounts,
    });
  }

  private async read<T>(
    contractId: string,
    method: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    if (!contractId) throw new Error('contractId is required');
    return this.makeClient(contractId).read<T>(method, args);
  }

  private write(
    contractId: string,
    method: string,
    args: Record<string, unknown> = {},
  ): xdr.Operation {
    if (!contractId) throw new Error('contractId is required');
    return this.makeClient(contractId).buildWrite(method, args);
  }

  private makeClient(contractId: string): ContractClient {
    return new ContractClient({
      contractId,
      sorobanRpcUrl: this.opts.sorobanRpcUrl,
      networkPassphrase: this.opts.networkPassphrase,
      simulationAccount: this.opts.simulationAccount,
    });
  }
}
