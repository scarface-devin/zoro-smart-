import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    // Clean up env before each test
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('STELLAR_') || key.startsWith('INDEXER_') || key.startsWith('SOLSHARE_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('STELLAR_') || key.startsWith('INDEXER_') || key.startsWith('SOLSHARE_')) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, ORIG_ENV);
  });

  it('returns defaults when no env vars are set', () => {
    const cfg = loadConfig();
    expect(cfg.network).toBe('TESTNET');
    expect(cfg.sorobanRpcUrl).toContain('soroban-testnet.stellar.org');
    expect(cfg.intervalMs).toBe(4000);
    expect(cfg.startLedger).toBe(0);
    expect(Array.isArray(cfg.contractIds)).toBe(true);
  });

  it('filters out empty contract IDs', () => {
    const cfg = loadConfig();
    expect(cfg.contractIds.every((id) => id.length > 0)).toBe(true);
  });

  it('picks up contract IDs from env', () => {
    process.env.SOLSHARE_REGISTRY_CONTRACT = 'CAAAA';
    process.env.SOLSHARE_RWA_TOKEN_CONTRACT = 'CBBBB';
    const cfg = loadConfig();
    expect(cfg.contractIds).toContain('CAAAA');
    expect(cfg.contractIds).toContain('CBBBB');
  });

  it('picks up custom network from env', () => {
    process.env.STELLAR_NETWORK = 'FUTURENET';
    const cfg = loadConfig();
    expect(cfg.network).toBe('FUTURENET');
  });

  it('picks up custom poll interval from env', () => {
    process.env.INDEXER_POLL_INTERVAL_MS = '8000';
    const cfg = loadConfig();
    expect(cfg.intervalMs).toBe(8000);
  });

  it('picks up custom start ledger from env', () => {
    process.env.INDEXER_START_LEDGER = '500000';
    const cfg = loadConfig();
    expect(cfg.startLedger).toBe(500000);
  });

  it('picks up custom soroban RPC URL from env', () => {
    process.env.STELLAR_SOROBAN_RPC_URL = 'https://custom-rpc.example.com';
    const cfg = loadConfig();
    expect(cfg.sorobanRpcUrl).toBe('https://custom-rpc.example.com');
  });
});
