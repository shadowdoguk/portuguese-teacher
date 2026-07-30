import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const API_PORT = Number(process.env.VITE_API_PORT ?? 4000);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: false,
        // Cookie credentials ride every request; secure:false in
        // dev (the API sets HttpOnly + SameSite=Lax + secure=false).
        cookieDomainRewrite: '',
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});