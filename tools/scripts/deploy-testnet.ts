#!/usr/bin/env tsx
/**
 * Build & deploy every SolShare contract to TESTNET, in canonical order:
 *
 *   1. solar-registry
 *   2. rwa-token          (one instance is later bound per array)
 *   3. yield-distributor  (one instance per rwa-token)
 *   4. bridge-wrapper
 *
 * Outputs a `.stellar/deployments/testnet.json` file with the script
 * addresses, which subsequent scripts (or dashboard env) can read.
 */

import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Keypair } from '@stellar/stellar-sdk';
import { logger } from './lib/logger.js';

const CONTRACT_DIR = path.resolve(__dirname, '../../contracts');
const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../.stellar/deployments');
const NETWORK = process.env.STELLAR_NETWORK ?? 'TESTNET';

interface DeployedContract {
  id: string;
  hash: string;
}

async function main() {
  const deployerSecret =
    process.env.SOLSHARE_DEPLOYER_SECRET ??
    (() => {
      logger.error('SOLSHARE_DEPLOYER_SECRET is required');
      process.exit(1);
    })();

  if (!Keypair.fromSecret(deployerSecret)) {
    logger.error('Invalid deployer secret');
    process.exit(1);
  }
  logger.info({ network: NETWORK }, 'building contracts');
  execSync(
    `cargo build --workspace --target wasm32-unknown-unknown --release`,
    { cwd: CONTRACT_DIR, stdio: 'inherit' },
  );

  await fs.mkdir(DEPLOYMENTS_DIR, { recursive: true });
  const installed: Record<string, DeployedContract> = {};

  const plan = ['solar-registry', 'rwa-token', 'yield-distributor', 'bridge-wrapper'];
  for (const contract of plan) {
    logger.info({ contract }, 'deploying');
    const wasmPath = path.join(CONTRACT_DIR, 'target/wasm32-unknown-unknown/release', `${contract}.wasm`);
    const id = execSync(
      `stellar contract deploy --wasm ${wasmPath} --source ${deployerSecret} --network ${NETWORK.toLowerCase()}`,
      { encoding: 'utf-8' },
    ).trim();
    installed[contract] = { id, hash: '' };
    logger.info({ contract, id }, 'deployed');
  }

  const outputPath = path.join(DEPLOYMENTS_DIR, `${NETWORK.toLowerCase()}.json`);
  await fs.writeFile(outputPath, JSON.stringify(installed, null, 2));
  logger.info({ outputPath }, 'deployment map written');
}

void main().catch((err) => {
  logger.error({ err }, 'deploy-testnet failed');
  process.exit(1);
});
