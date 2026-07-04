#!/usr/bin/env tsx
/**
 * Production mainnet deploy. Same flow as testnet but with an additional
 * confirmation prompt and a 30s grace period after every upload to let
 * humans react.
 */

import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as readline from 'node:readline/promises';
import path from 'node:path';
import { Keypair } from '@stellar/stellar-sdk';
import { logger } from './lib/logger.js';

const CONTRACT_DIR = path.resolve(__dirname, '../../contracts');
const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../.stellar/deployments');

async function confirm() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('Type MAINNET-DEPLOY to continue: ');
    if (answer !== 'MAINNET-DEPLOY') {
      logger.warn('aborted by user');
      process.exit(2);
    }
  } finally {
    rl.close();
  }
}

async function main() {
  await confirm();
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
  execSync(
    `cargo build --workspace --target wasm32-unknown-unknown --release`,
    { cwd: CONTRACT_DIR, stdio: 'inherit' },
  );
  await fs.mkdir(DEPLOYMENTS_DIR, { recursive: true });
  const installed: Record<string, { id: string; hash: string }> = {};
  const plan = ['solar-registry', 'rwa-token', 'yield-distributor', 'bridge-wrapper'];
  for (const contract of plan) {
    logger.info({ contract }, 'deploying to PUBLIC');
    const wasmPath = path.join(
      CONTRACT_DIR,
      'target/wasm32-unknown-unknown/release',
      `${contract}.wasm`,
    );
    const id = execSync(
      `stellar contract deploy --wasm ${wasmPath} --source ${deployerSecret} --network public`,
      { encoding: 'utf-8' },
    ).trim();
    installed[contract] = { id, hash: '' };
    logger.warn({ contract, id }, 'DEPLOYED — sleeping 30s');
    await new Promise((r) => setTimeout(r, 30_000));
  }
  const outputPath = path.join(DEPLOYMENTS_DIR, 'public.json');
  await fs.writeFile(outputPath, JSON.stringify(installed, null, 2));
  logger.info({ outputPath }, 'mainnet deployment map written');
}

void main().catch((err) => {
  logger.error({ err }, 'deploy-mainnet failed');
  process.exit(1);
});
