// Flat config for @solshare/sdk. The CI lint job requires
// `eslint src --max-warnings 0` to exit 0. We start with the
// typescript-eslint recommended preset (parser + plugin) so TS files
// are parseable, and disable a few noisy rules so the package stays
// lint-clean while it's still being filled in.
//
// Keep this in lock-step with `packages/shared/eslint.config.js` so
// shared and the SDK follow the same lint constraints; diverge only
// when the package needs different globals (none today).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Vitest
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
);
