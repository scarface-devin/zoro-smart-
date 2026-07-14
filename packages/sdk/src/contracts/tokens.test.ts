import { describe, it, expect } from 'vitest';
import { TokensClient } from './tokens.js';
import { SimulationAccount } from '../simulation-account.js';

const NEW_TOKENS = () =>
  new TokensClient({
    sorobanRpcUrl: 'http://localhost:8000/soroban/rpc',
    networkPassphrase: 'Test SDF Network ; September 2015',
    simulationAccount: SimulationAccount.random(),
  });

describe('TokensClient', () => {
  it('rejects empty contractId on every read', async () => {
    const tc = NEW_TOKENS();
    await expect(tc.readMetadata('')).rejects.toThrow('contractId is required');
    await expect(tc.readTotalSupply('')).rejects.toThrow('contractId is required');
    await expect(tc.readBalance('', 'G' + 'A'.repeat(55))).rejects.toThrow(
      'contractId is required',
    );
    await expect(tc.readAllowance('', 'G' + 'A'.repeat(55), 'G' + 'B'.repeat(55))).rejects.toThrow(
      'contractId is required',
    );
    await expect(tc.readPaused('')).rejects.toThrow('contractId is required');
    await expect(tc.readAdmin('')).rejects.toThrow('contractId is required');
  });

  it('rejects empty contractId on every builder', () => {
    const tc = NEW_TOKENS();
    expect(() => tc.buildTransfer('', 'G' + 'A'.repeat(55), 'G' + 'B'.repeat(55), '1')).toThrow(
      'contractId is required',
    );
    expect(() =>
      tc.buildApprove(
        '',
        'G' + 'A'.repeat(55),
        'G' + 'B'.repeat(55),
        '1',
        0,
      ),
    ).toThrow('contractId is required');
    expect(() => tc.buildBurn('', 'G' + 'A'.repeat(55), '1')).toThrow(
      'contractId is required',
    );
  });
});
