import { describe, it, expect } from 'vitest';
import {
  PLATFORM_SUPPORT_MATRIX,
  formatStatusBadge,
  type SupportStatus,
} from './platforms.js';

describe('Platform Support Matrix', () => {
  it('contains expected network and wallet surfaces', () => {
    const surfaces = PLATFORM_SUPPORT_MATRIX.map((e) => e.surface);
    expect(surfaces).toContain('Stellar Horizon');
    expect(surfaces).toContain('Soroban RPC');
    expect(surfaces).toContain('Ethereum bridge watcher');
    expect(surfaces).toContain('Solana bridge watcher');
    expect(surfaces).toContain('Polygon bridge watcher');
    expect(surfaces).toContain('Freighter wallet');
    expect(surfaces).toContain('Albedo wallet');
    expect(surfaces).toContain('Lobstr wallet');
  });

  it('correctly maps status badges for all support states', () => {
    expect(formatStatusBadge('supported')).toBe('✅');
    expect(formatStatusBadge('pending_audit')).toBe('⏳ pending audit');
    expect(formatStatusBadge('scaffold')).toBe('⏳ scaffold');
    expect(formatStatusBadge('not_started')).toBe('❌');
  });

  it('has non-empty sourceOfTruth documentation for each surface', () => {
    for (const entry of PLATFORM_SUPPORT_MATRIX) {
      expect(entry.sourceOfTruth.length).toBeGreaterThan(0);
      expect(['supported', 'scaffold', 'pending_audit', 'not_started']).toContain(
        entry.testnet
      );
      expect(['supported', 'scaffold', 'pending_audit', 'not_started']).toContain(
        entry.mainnet
      );
    }
  });
});
