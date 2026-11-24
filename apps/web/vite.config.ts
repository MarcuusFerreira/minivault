import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Same-origin in development too, so the session cookie behaves as in production.
  server: { proxy: { '/api': 'http://localhost:3000' } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['src/test/setup.ts'], css: false },
});
