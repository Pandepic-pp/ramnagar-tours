import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: {
      port: 5173,
      // Same-origin in the browser's eyes, so the SameSite=Lax session cookie just works and CORS never comes up
      proxy: { '/api': { target: env.VITE_DEV_API_TARGET || 'http://localhost:5100', changeOrigin: true } },
    },
    build: { sourcemap: false, chunkSizeWarningLimit: 600 },
  };
});
