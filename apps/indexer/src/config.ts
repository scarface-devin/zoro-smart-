import { z } from 'zod';

const schema = z.object({
  STELLAR_NETWORK: z.enum(['PUBLIC', 'TESTNET', 'FUTURENET', 'STANDALONE']).default('TESTNET'),
  STELLAR_SOROBAN_RPC_URL: z
    .string()
    .url()
    .default('https://soroban-testnet.stellar.org'),
  INDEXER_DATABASE_URL: z.string().default('postgres://solshare:solshare@localhost:5432/solshare'),
  INDEXER_REDIS_URL: z.string().default('redis://localhost:6379'),
  INDEXER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(4000),
  INDEXER_START_LEDGER: z.coerce.number().int().nonnegative().default(0),
  SOLSHARE_REGISTRY_CONTRACT: z.string().default(''),
  SOLSHARE_RWA_TOKEN_CONTRACT: z.string().default(''),
  SOLSHARE_DISTRIBUTOR_CONTRACT: z.string().default(''),
  SOLSHARE_BRIDGE_CONTRACT: z.string().default(''),
});

export type IndexerConfig = z.infer<typeof schema>;

export function loadConfig(): {
  network: string;
  sorobanRpcUrl: string;
  contractIds: string[];
  intervalMs: number;
  startLedger: number;
} {
  const cfg = schema.parse(process.env);
  const contractIds = [
    cfg.SOLSHARE_REGISTRY_CONTRACT,
    cfg.SOLSHARE_RWA_TOKEN_CONTRACT,
    cfg.SOLSHARE_DISTRIBUTOR_CONTRACT,
    cfg.SOLSHARE_BRIDGE_CONTRACT,
  ].filter((s) => s.length > 0);
  return {
    network: cfg.STELLAR_NETWORK,
    sorobanRpcUrl: cfg.STELLAR_SOROBAN_RPC_URL,
    contractIds,
    intervalMs: cfg.INDEXER_POLL_INTERVAL_MS,
    startLedger: cfg.INDEXER_START_LEDGER,
  };
}
