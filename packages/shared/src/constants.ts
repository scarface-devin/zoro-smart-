/**
 * Stellar network identifiers and well-known endpoints.
 * `process.env` overrides take precedence, but these sane defaults mean the
 * SDK works out of the box against Testnet for local dev.
 */

export const STELLAR_NETWORKS = {
  PUBLIC: 'PUBLIC',
  TESTNET: 'TESTNET',
  FUTURENET: 'FUTURENET',
  STANDALONE: 'STANDALONE',
} as const;

export type StellarNetwork = (typeof STELLAR_NETWORKS)[keyof typeof STELLAR_NETWORKS];

export const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  PUBLIC: 'Public Global Stellar Network ; September 2015',
  TESTNET: 'Test SDF Network ; September 2015',
  FUTURENET: 'Test SDF Future Network ; October 2022',
  STANDALONE: 'Standalone Network ; February 2017',
};

export const NETWORK_ENDPOINTS: Record<
  StellarNetwork,
  { horizon: string; sorobanRpc: string; friendbot?: string }
> = {
  PUBLIC: {
    horizon: 'https://horizon.stellar.org',
    sorobanRpc: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
  },
  TESTNET: {
    horizon: 'https://horizon-testnet.stellar.org',
    sorobanRpc: 'https://soroban-testnet.stellar.org',
    friendbot: 'https://friendbot.stellar.org',
  },
  FUTURENET: {
    horizon: 'https://horizon-futurenet.stellar.org',
    sorobanRpc: 'https://rpc-futurenet.stellar.org',
    friendbot: 'https://friendbot-futurenet.stellar.org',
  },
  STANDALONE: {
    horizon: 'http://localhost:8000',
    sorobanRpc: 'http://localhost:8000/soroban/rpc',
    friendbot: 'http://localhost:8000/friendbot',
  },
};

export function resolveNetwork(network?: string): StellarNetwork {
  const n = (network ?? process.env.STELLAR_NETWORK ?? 'TESTNET').toUpperCase();
  if (!(n in STELLAR_NETWORKS)) {
    throw new Error(`Unknown Stellar network: ${n}`);
  }
  return n as StellarNetwork;
}

export function resolveHorizonUrl(network?: string): string {
  return NETWORK_ENDPOINTS[resolveNetwork(network)].horizon;
}

export function resolveSorobanRpcUrl(network?: string): string {
  return NETWORK_ENDPOINTS[resolveNetwork(network)].sorobanRpc;
}

/** Source chains supported by the bridge-wrapper contract. */
export const SUPPORTED_SOURCE_CHAINS = [
  'ethereum',
  'sepolia',
  'polygon',
  'amoy',
  'solana',
  'solana-devnet',
  'arbitrum',
  'optimism',
  'base',
] as const;

export type SourceChain = (typeof SUPPORTED_SOURCE_CHAINS)[number];

export const SOURCE_CHAIN_IDS: Record<SourceChain, number> = {
  ethereum: 1,
  sepolia: 11155111,
  polygon: 137,
  amoy: 80002,
  solana: 999999, // custom id range for non-EVM chains
  'solana-devnet': 999998,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
};

/** Event topic prefixes emitted by SolShare contracts. */
export const CONTRACT_EVENTS = {
  Init: 'init',
  Mint: 'mint',
  Burn: 'burn',
  Transfer: 'transfer',
  Approve: 'approve',
  Register: 'register',
  Update: 'update',
  Decommission: 'decommission',
  Fund: 'fund',
  Claim: 'claim',
  Wrap: 'wrap',
  Unwrap: 'unwrap',
  ValidatorSet: 'validatorset',
} as const;

export const PROJECT_INFO = {
  name: 'SolShare Network',
  version: '0.1.0',
  description:
    'A Soroban-powered Real World Asset (RWA) engine for crowdfunded urban solar arrays, with cross-chain wrapping middleware.',
  repoUrl: 'https://github.com/solshare-network/solshare-network',
} as const;
