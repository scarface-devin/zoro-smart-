import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const apiBase = env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@solshare/shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@solshare/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target: apiBase, changeOrigin: true, ws: true },
      },
    },
    preview: { port: 5173, host: true },
    build: {
      sourcemap: mode !== 'production',
      target: 'es2022',
    },
  };
});
