/**
 * Vite configuration for the Smart EDMS Electron desktop client.
 *
 * Builds three artefacts:
 *  1. The renderer (React + Mantine) — output to `dist/renderer`.
 *  2. The Electron main process — output to `dist/main/index.js`.
 *  3. The preload script — output to `dist/main/preload.js`, served with
 *     contextIsolation so the renderer cannot reach Node primitives.
 *
 * Spec ref: §4.1 (Electron deployment), §7.1 (security defaults),
 * §27.5 (Mantine v7).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

export default defineConfig({
  // Renderer served at root; built to dist/renderer
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  resolve: {
    alias: {
      '@smart-edms/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@smart-edms/schemas': path.resolve(__dirname, '../../packages/schemas/src/index.ts'),
      '@smart-edms/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@smart-edms/license-core': path.resolve(__dirname, '../../packages/license-core/src/index.ts'),
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: {
          index: path.resolve(__dirname, 'src/main/index.ts'),
        },
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['electron', 'electron-updater'],
            },
          },
        },
      },
      {
        // Preload script — separate entry so it can be sandboxed
        entry: {
          preload: path.resolve(__dirname, 'src/main/preload.ts'),
        },
        onstart({ reload }) {
          // Preload changes require a full window reload (not HMR).
          reload();
        },
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
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
            '@mantine/dropzone',
          ],
          i18n: ['i18next', 'react-i18next', '@smart-edms/i18n'],
          data: ['@tanstack/react-query', 'zustand', 'zod', 'axios', 'socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['electron'],
  },
});
