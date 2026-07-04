/* eslint-env node */
module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: '18.3' },
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    'out',
    '.turbo',
    'coverage',
    'target',
    'contracts/target',
    'apps/web/dist',
    'apps/web/public/build',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-undef': 'off',
  },
  overrides: [
    {
      files: ['*.cjs'],
      env: { node: true },
    },
    {
      files: ['apps/web/src/**/*.{ts,tsx}'],
      env: { browser: true },
    },
  ],
};
