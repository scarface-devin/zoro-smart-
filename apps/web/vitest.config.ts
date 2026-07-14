import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@solshare/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@solshare/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // Lets `pnpm -r --filter ./apps/* run test` (the CI filter) exit 0
    // before any test fixtures are added. Drop once real tests land.
    passWithNoTests: true,
  },
});
