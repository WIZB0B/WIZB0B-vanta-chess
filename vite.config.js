import { defineConfig } from 'vite';
import { securityHeaders } from './scripts/security-headers.mjs';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  server: {
    strictPort: true,
  },
  preview: {
    headers: securityHeaders,
  },
});
