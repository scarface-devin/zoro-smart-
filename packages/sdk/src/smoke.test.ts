import { describe, it, expect } from 'vitest';
import { PROJECT_INFO } from '@solshare/shared';

/**
 * Smoke test scaffold for `@solshare/sdk`.
 *
 * The SDK's current surface is mostly thin Soroban/Horizon RPC wrappers
 * that talk to remote testnet endpoints, so we don't run live-network
 * tests here. This file exists so `pnpm -r --filter './packages/**' run
 * test` (the CI filter) does not exit with the vitest
 * `No test files found` code-1 path. Replace these tests with real
 * coverage as the SDK matures.
 */
describe('@solshare/sdk smoke', () => {
  it('loads PROJECT_INFO from @solshare/shared', () => {
    expect(PROJECT_INFO).toBeDefined();
    expect(typeof PROJECT_INFO.name).toBe('string');
    expect(PROJECT_INFO.name.length).toBeGreaterThan(0);
  });
});
