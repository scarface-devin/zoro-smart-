import { defineConfig } from 'vitest/config';

// `passWithNoTests: true` lets `pnpm -r --filter ./apps/* run test`
// (the CI filter) exit 0 even before any test fixtures land. Drop
// the flag once real tests are added.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
