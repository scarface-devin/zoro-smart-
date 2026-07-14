// Flat config for @solshare/web. Mirrors packages/shared/eslint.config.js,
// packages/sdk/eslint.config.js, and apps/api/eslint.config.js, with the
// globals extended for React/JSX test environments. The CI lint job runs
// `eslint src --max-warnings 0` per app — this config exists so the call
// doesn't fail with "could not find supported configuration file".
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Vitest + jsdom
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        // Browser
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        HTMLElement: 'readonly',
        // Node (config + tooling may touch process)
        process: 'readonly',
        console: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      // Disabled because the apps have a couple of intentional `any`
      // types for untyped private state (e.g. ioredis clients in
      // cache.ts and redis-bus.ts). Re-enable once those are
      // properly typed as `Redis | null` (tracked as a follow-up).
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
);
