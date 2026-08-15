/**
 * Vite configuration for the Smart EDMS License Admin Panel (spec §7.4, §12.10).
 *
 * Hosted as a sibling of `apps/license-server`. Default dev port `5175`
 * (avoids clashing with the Electron renderer at 5173). The Licensing Server
 * CORS origins must include this port (configured via the license-server's
 * `CORS_ORIGINS` env var).
 *
 * Workspace packages (`@smart-edms/types`, `@smart-edms/schemas`,
 * `@smart-edms/i18n`) are aliased to their source so HMR picks up edits
 * without a rebuild step.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname),
  base: './',
  resolve: {
    alias: {
      '@smart-edms/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@smart-edms/schemas': path.resolve(__dirname, '../../packages/schemas/src/index.ts'),
      '@smart-edms/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@smart-edms/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@smart-edms/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
      '@smart-edms/license-core': path.resolve(__dirname, '../../packages/license-core/src/index.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mantine: [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/form',
            '@mantine/notifications',
            '@mantine/modals',
            '@mantine/dates',
          ],
          i18n: ['i18next', 'react-i18next', '@smart-edms/i18n'],
          data: ['@tanstack/react-query', 'zustand', 'zod', 'axios'],
          table: ['mantine-react-table'],
        },
      },
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      // Proxy /v1 to the licensing server during dev so cookies and CORS
      // are handled without a separate proxy in the developer's browser.
      '/v1': {
        target: process.env.LICENSE_SERVER_URL ?? 'http://localhost:4100',
        changeOrigin: true,
      },
    },
  },
});
