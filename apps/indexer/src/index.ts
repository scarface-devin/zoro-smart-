import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { startPoller } from './poller.js';
import { connectRedis, publish } from './redis-bus.js';

async function main() {
  const cfg = loadConfig();
  logger.info(
    { network: cfg.network, rpcUrl: cfg.sorobanRpcUrl, contracts: cfg.contractIds },
    'SolShare indexer starting',
  );
  await connectRedis();

  await startPoller({
    rpcUrl: cfg.sorobanRpcUrl,
    contractIds: cfg.contractIds,
    intervalMs: cfg.intervalMs,
    startLedger: cfg.startLedger,
    onEvent: async (event) => {
      try {
        await publish('solshare:events', event);
        logger.debug({ event: event.pagingToken, contract: event.contractId }, 'event');
      } catch (err) {
        logger.error({ err }, 'publish failed');
      }
    },
  });
}

void main().catch((err) => {
  logger.error({ err }, 'indexer crashed');
  process.exit(1);
});
