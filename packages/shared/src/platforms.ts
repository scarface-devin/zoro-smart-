/**
 * Platform and network support matrix for SolShare Network.
 * Defines supported surfaces across Stellar, bridge chains, and wallet providers.
 */

export type SupportStatus = 'supported' | 'scaffold' | 'pending_audit' | 'not_started';

export interface PlatformSupportEntry {
  surface: string;
  testnet: SupportStatus;
  mainnet: SupportStatus;
  sourceOfTruth: string;
}

export const PLATFORM_SUPPORT_MATRIX: readonly PlatformSupportEntry[] = [
  {
    surface: 'Stellar Horizon',
    testnet: 'supported',
    mainnet: 'supported',
    sourceOfTruth: 'packages/shared/src/constants.ts',
  },
  {
    surface: 'Soroban RPC',
    testnet: 'supported',
    mainnet: 'pending_audit',
    sourceOfTruth: 'packages/shared/src/constants.ts',
  },
  {
    surface: 'Ethereum bridge watcher',
    testnet: 'scaffold',
    mainnet: 'not_started',
    sourceOfTruth: 'apps/indexer/src/watchers/eth.ts (TBD)',
  },
  {
    surface: 'Solana bridge watcher',
    testnet: 'not_started',
    mainnet: 'not_started',
    sourceOfTruth: 'not started',
  },
  {
    surface: 'Polygon bridge watcher',
    testnet: 'not_started',
    mainnet: 'not_started',
    sourceOfTruth: 'not started',
  },
  {
    surface: 'Freighter wallet',
    testnet: 'supported',
    mainnet: 'supported',
    sourceOfTruth: 'packages/sdk/src/wallet.ts',
  },
  {
    surface: 'Albedo wallet',
    testnet: 'scaffold',
    mainnet: 'not_started',
    sourceOfTruth: 'not started',
  },
  {
    surface: 'Lobstr wallet',
    testnet: 'not_started',
    mainnet: 'not_started',
    sourceOfTruth: 'not started',
  },
] as const;

export function formatStatusBadge(status: SupportStatus): string {
  switch (status) {
    case 'supported':
      return '✅';
    case 'pending_audit':
      return '⏳ pending audit';
    case 'scaffold':
      return '⏳ scaffold';
    case 'not_started':
      return '❌';
  }
}
