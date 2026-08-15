// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright + Electron E2E test configuration for Smart EDMS.
 *
 * Spec ref: §24.1 (testing — e2e tests for critical journeys),
 *           §24.2 (critical test cases — login, theme toggle, language
 *           switcher RTL, tour engine, AI bubble license-gating).
 *
 * Tests run against the Vite dev server (port 5173) by default. For
 * production builds, run `pnpm --filter @smart-edms/electron build` first
 * and set `E2E_TARGET=build`.
 *
 * Required backend services: PostgreSQL, Redis, MinIO (via `docker compose
 * up -d postgres redis minio`). Run `pnpm --filter @smart-edms/backend db:migrate`
 * and `pnpm --filter @smart-edms/backend db:seed` before running E2E.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Electron tests cannot run in parallel against one app instance
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    // LTR locales (English baseline)
    {
      name: 'en-chromium',
      use: { ...devices['Desktop Chrome'], locale: 'en-US' },
    },
    // RTL locale (Arabic) — critical for §16.7 RTL verification
    {
      name: 'ar-chromium',
      use: { ...devices['Desktop Chrome'], locale: 'ar' },
    },
    // Additional locale coverage
    {
      name: 'fr-chromium',
      use: { ...devices['Desktop Chrome'], locale: 'fr-FR' },
      testIgnore: /.*\.rtl\.spec\.ts/,
    },
  ],

  webServer: process.env.E2E_SKIP_DEV_SERVER
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
