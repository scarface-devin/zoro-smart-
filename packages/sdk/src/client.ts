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

export type SolShareNetwork = StellarNetwork;

export interface SolShareClientOptions {
  network?: SolShareNetwork;
  horizonUrl?: string;
  sorobanRpcUrl?: string;
  /** Optional passphrases; inferred from network if omitted. */
  networkPassphrase?: string;
  /** Pre-bound contract addresses. */
  contracts?: Partial<ContractAddresses>;
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
    );
    this.rwaToken = new RwaTokenContract(
      this.contracts.rwaToken,
      this.sorobanRpcUrl,
      this.networkPassphrase,
    );
    this.yieldDistributor = new YieldDistributorContract(
      this.contracts.yieldDistributor,
      this.sorobanRpcUrl,
      this.networkPassphrase,
    );
    this.bridge = new BridgeWrapperContract(
      this.contracts.bridgeWrapper,
      this.sorobanRpcUrl,
      this.networkPassphrase,
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
}
