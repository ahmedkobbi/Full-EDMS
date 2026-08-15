import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.module.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@smart-edms/types': resolve(__dirname, '../../packages/types/src'),
      '@smart-edms/schemas': resolve(__dirname, '../../packages/schemas/src'),
      '@smart-edms/license-core': resolve(__dirname, '../../packages/license-core/src'),
    },
  },
});
