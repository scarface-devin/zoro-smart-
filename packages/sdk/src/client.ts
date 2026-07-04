import {
  resolveHorizonUrl,
  resolveNetwork,
  resolveSorobanRpcUrl,
  PROJECT_INFO,
  type StellarNetwork,
} from '@solshare/shared';

import { HorizonClient } from './horizon.js';
import { SorobanClient } from './soroban.js';
import { WalletClient } from './wallet.js';
import { StreamClient } from './stream.js';
import {
  RwaTokenContract,
  SolarRegistryContract,
  YieldDistributorContract,
  BridgeWrapperContract,
} from './contracts/index.js';
import { SimulationAccount, fundSimulationAccount } from './simulation-account.js';

export type SolShareNetwork = StellarNetwork;

export interface SolShareClientOptions {
  network?: SolShareNetwork;
  horizonUrl?: string;
  sorobanRpcUrl?: string;
  /** Optional passphrases; inferred from network if omitted. */
  networkPassphrase?: string;
  /** Pre-bound contract addresses. */
  contracts?: Partial<ContractAddresses>;
  /**
   * Source account used for every `simulateTransaction` call across all
   * four contract wrappers. If omitted, a fresh ed25519 keypair is
   * generated; on TESTNET / FUTURENET call `fundSimulationAccount()` to
   * top it up via Friendbot. The PUBLIC network has no Friendbot, so
   * callers must supply a pre-funded account (or set a new one via
   * `setSimulationAccount`) before any read will resolve.
   */
  simulationAccount?: SimulationAccount;
}

export interface ContractAddresses {
  rwaToken: string;
  solarRegistry: string;
  yieldDistributor: string;
  bridgeWrapper: string;
}

const DEFAULT_ADDRESSES: ContractAddresses = {
  rwaToken: '',
  solarRegistry: '',
  yieldDistributor: '',
  bridgeWrapper: '',
};

/**
 * The main SolShare SDK entry point. Construct via the static factory methods
 * (`forTestnet`, `forPublic`, `forFuturenet`) or directly with `new`.
 */
export class SolShareClient {
  readonly network: SolShareNetwork;
  readonly horizonUrl: string;
  readonly sorobanRpcUrl: string;
  readonly networkPassphrase: string;

  readonly contracts: ContractAddresses;
  simulationAccount: SimulationAccount;

  readonly horizon: HorizonClient;
  readonly soroban: SorobanClient;
  readonly wallet: WalletClient;
  readonly stream: StreamClient;
  readonly registry: SolarRegistryContract;
  readonly rwaToken: RwaTokenContract;
  readonly yieldDistributor: YieldDistributorContract;
  readonly bridge: BridgeWrapperContract;

  constructor(opts: SolShareClientOptions = {}) {
    this.network = resolveNetwork(opts.network ?? process.env.STELLAR_NETWORK);
    this.horizonUrl = opts.horizonUrl ?? resolveHorizonUrl(this.network);
    this.sorobanRpcUrl = opts.sorobanRpcUrl ?? resolveSorobanRpcUrl(this.network);
    this.networkPassphrase =
      opts.networkPassphrase ??
      {
        PUBLIC: 'Public Global Stellar Network ; September 2015',
        TESTNET: 'Test SDF Network ; September 2015',
        FUTURENET: 'Test SDF Future Network ; October 2022',
        STANDALONE: 'Standalone Network ; February 2017',
      }[this.network];

    this.contracts = { ...DEFAULT_ADDRESSES, ...(opts.contracts ?? {}) };
    this.simulationAccount = opts.simulationAccount ?? SimulationAccount.random();

    this.horizon = new HorizonClient(this.horizonUrl);
    this.soroban = new SorobanClient(this.sorobanRpcUrl);
    this.wallet = new WalletClient();
    this.stream = new StreamClient({
      horizonUrl: this.horizonUrl,
      sorobanRpcUrl: this.sorobanRpcUrl,
    });

    this.registry = new SolarRegistryContract(
      this.contracts.solarRegistry,
      this.sorobanRpcUrl,
      this.networkPassphrase,
      this.simulationAccount,
    );
    this.rwaToken = new RwaTokenContract(
      this.contracts.rwaToken,
      this.sorobanRpcUrl,
      this.networkPassphrase,
      this.simulationAccount,
    );
    this.yieldDistributor = new YieldDistributorContract(
      this.contracts.yieldDistributor,
      this.sorobanRpcUrl,
      this.networkPassphrase,
      this.simulationAccount,
    );
    this.bridge = new BridgeWrapperContract(
      this.contracts.bridgeWrapper,
      this.sorobanRpcUrl,
      this.networkPassphrase,
      this.simulationAccount,
    );
  }

  static forTestnet(): SolShareClient {
    return new SolShareClient({ network: 'TESTNET' });
  }
  static forPublic(): SolShareClient {
    return new SolShareClient({ network: 'PUBLIC' });
  }
  static forFuturenet(): SolShareClient {
    return new SolShareClient({ network: 'FUTURENET' });
  }
  static forStandalone(): SolShareClient {
    return new SolShareClient({ network: 'STANDALONE' });
  }

  /** Returns project information. */
  info() {
    return PROJECT_INFO;
  }

  /**
   * Replace the source account used for every `simulateTransaction` call
   * across all four contract wrappers. The passed `account` is used
   * verbatim (publicKey, secretKey, and sequenceNumber), so callers that
   * need to point the SDK at a specific keypair — e.g. one already
   * funded in their dev environment, or one matching a specific Horizon
   * account they manage — can do so without losing the existing
   * sequence number. Pass the secret key to enable subsequent
   * `fundSimulationAccount()` calls; omit it for read-only use.
   */
  setSimulationAccount(account: SimulationAccount): void {
    this.simulationAccount = account;
    // Each ContractClient must be told about the new reference, since
    // we replaced the instance rather than mutating it in place.
    this.registry.setSimulationAccount(account);
    this.rwaToken.setSimulationAccount(account);
    this.yieldDistributor.setSimulationAccount(account);
    this.bridge.setSimulationAccount(account);
  }

  /**
   * Fund the current simulation account through Friendbot. Only works on
   * TESTNET and FUTURENET; on PUBLIC the caller must fund the account
   * directly. Requires that the simulation account was created with a
   * secret key (either auto-generated or supplied via
   * `setSimulationAccount`).
   */
  async fundSimulationAccount(): Promise<unknown> {
    if (this.network !== 'TESTNET' && this.network !== 'FUTURENET') {
      throw new Error(
        `Friendbot funding is not available on network ${this.network}; fund the simulation account yourself before calling read()`,
      );
    }
    return fundSimulationAccount(this.simulationAccount, this.network);
  }
}
