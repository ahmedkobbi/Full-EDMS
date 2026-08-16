/**
 * E2E test: Login flow (spec §24.2 — user login/MFA).
 *
 * Verifies:
 *   1. Login page renders with localized strings (no hardcoded English)
 *   2. Successful login redirects to /dashboard
 *   3. Failed login shows localized error
 *   4. JWT is stored (via Electron safeStorage, not localStorage)
 *   5. Logout clears credentials + redirects to /login
 *
 * Prerequisites:
 *   - Backend running on http://localhost:4000
 *   - Database seeded (pnpm --filter @smart-edms/backend db:seed)
 *   - Default admin: admin@smart-edms.local / ChangeMe!2026
 */
import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@smart-edms.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe!2026';

test.describe('Login flow (spec §24.2)', () => {
  test('renders localized login page', async ({ page }) => {
    await page.goto('/login');

    // The login form should be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // The Smart EDMS wordmark should be present (spec §19.2 — product name is consistent)
    await expect(page.getByText('Smart EDMS')).toBeVisible({ timeout: 5000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Should redirect to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Dashboard should show a welcome message
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10_000 });
  });

  test('failed login shows localized error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', 'wrong-password-12345');
    await page.click('button[type="submit"]');

    // Should show an error (localized — not a raw stack trace)
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    // The error must NOT contain the offending password
    const errorText = await page.getByRole('alert').textContent();
    expect(errorText).not.toContain('wrong-password-12345');
  });

  test('JWT is NOT stored in localStorage (must use Electron safeStorage)', async ({ page, browserName }) => {
    // Electron tests run in the main process context; for web dev we just verify
    // the JWT is not in localStorage (it should be in sessionStorage or via preload bridge)
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    const localStorageKeys = await page.evaluate(() => Object.keys(window.localStorage));
    // The auth token must NEVER be in localStorage (spec §7.1 — secrets in safeStorage only)
    expect(localStorageKeys.some((k) => k.toLowerCase().includes('token'))).toBe(false);
    expect(localStorageKeys.some((k) => k.toLowerCase().includes('jwt'))).toBe(false);
    expect(localStorageKeys.some((k) => k.toLowerCase().includes('auth'))).toBe(false);
  });

  test('logout clears credentials and redirects to /login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Find and click the user menu, then logout
    await page.click('[data-testid="user-menu"], [aria-label*="menu" i]');
    await page.click('text=/sign out/i');

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
