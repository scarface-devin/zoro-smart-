import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@solshare/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
    },
  },
});
