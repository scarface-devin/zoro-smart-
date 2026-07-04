#!/usr/bin/env tsx
/**
 * Read-only inspector. Uses the SDK to display a summary of each contract's
 * public-facing state, including all registered arrays and aggregated
 * supply / yield.
 */

import { SolShareClient } from '@solshare/sdk';
import { logger } from './lib/logger.js';

async function main() {
  const client = SolShareClient.forTestnet();
  logger.info({ network: client.network, sorobanRpc: client.sorobanRpcUrl }, 'inspecting');

  const info = await client.horizon.serverInfo().catch((e) => ({ error: String(e) }));
  logger.info({ info }, 'horizon server info');

  const ids = await client.registry.getAllArrays().catch((e) => {
    logger.error({ err: e }, 'registry query failed');
    return [];
  });
  logger.info({ count: ids.length }, 'arrays registered');

  for (const summary of ids) {
    logger.info({ id: summary.id, status: summary.status, capacity: summary.ratedCapacityW }, 'array');
    const detail = await client.registry.getArray(summary.id).catch(() => null);
    if (detail) {
      logger.info(detail, 'detail');
    }
  }

  const yps = await client.yieldDistributor.yieldPerShare().catch(() => '0');
  logger.info({ yieldPerShare: yps }, 'global yield-per-share');

  const supply = await client.rwaToken.readTotalSupply().catch(() => '0');
  logger.info({ totalSupply: supply }, 'rwa-token total supply');
}

void main().catch((err) => {
  logger.error({ err }, 'inspector failed');
  process.exit(1);
});
