import { SolShareClient } from '@solshare/sdk';
import { env } from './env.js';

let _client: SolShareClient | null = null;

export function getClient(): SolShareClient {
  if (!_client) {
    _client = new SolShareClient({
      network: env.STELLAR_NETWORK,
      horizonUrl: env.STELLAR_HORIZON_URL,
      sorobanRpcUrl: env.STELLAR_SOROBAN_RPC_URL,
      networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
      contracts: {
        rwaToken: process.env.SOLSHARE_RWA_TOKEN_CONTRACT ?? '',
        solarRegistry: process.env.SOLSHARE_REGISTRY_CONTRACT ?? '',
        yieldDistributor: process.env.SOLSHARE_DISTRIBUTOR_CONTRACT ?? '',
        bridgeWrapper: process.env.SOLSHARE_BRIDGE_CONTRACT ?? '',
        governance: process.env.SOLSHARE_GOVERNANCE_CONTRACT ?? '',
      },
    });
  }
  return _client;
}
