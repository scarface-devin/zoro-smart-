#!/usr/bin/env tsx
/**
 * Bootstrap a Stellar testnet account using a fresh keypair. We use this
 * in CI before running deploy-testnet.ts because we don't want secrets
 * baked into the deploy script.
 */

import { Keypair } from '@stellar/stellar-sdk';
import { logger } from './lib/logger.js';

async function main() {
  const friendbot = process.env.STELLAR_FRIENDBOT_URL ?? 'https://friendbot.stellar.org';
  const pair = Keypair.random();
  logger.info('generated keypair');
  const res = await fetch(`${friendbot}?addr=${encodeURIComponent(pair.publicKey())}`);
  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, 'friendbot failed');
    process.exit(1);
  }
  logger.info({ publicKey: pair.publicKey() }, 'funded via friendbot');
  logger.info({ secret: pair.secret() }, 'DO NOT COMMIT — write to your .env file');
  // Also export to stdout for shell capture.
  process.stdout.write(`STELLAR_DEPLOYER_PUBLIC=${pair.publicKey()}\n`);
  process.stdout.write(`STELLAR_DEPLOYER_SECRET=${pair.secret()}\n`);
}

void main().catch((err) => {
  logger.error({ err }, 'setup-stellar-env failed');
  process.exit(1);
});
