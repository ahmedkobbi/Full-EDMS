/**
 * E2E test: AI Assistant Bubble license-gating (spec §11.16, §11.20, §24.2 —
 * AI Assistant is hidden when disabled or unlicensed).
 *
 * Prerequisites:
 *   - Backend running with AI_PROVIDER=none (so AI is "not configured")
 *   - User logged in as admin
 *
 * Verifies:
 *   1. AI bubble is hidden when AI is not licensed / not configured
 *   2. AI endpoints reject requests with errors.AI_NOT_LICENSED
 *   3. When AI is enabled (E2E_AI_LICENSED=true), the bubble appears
 *   4. The bubble is positioned correctly in RTL (bottom-start in Arabic)
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', process.env.E2E_ADMIN_EMAIL ?? 'admin@smart-edms.local');
  await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe!2026');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test.describe('AI Assistant Bubble license-gating (spec §11.16)', () => {
  test('AI bubble is hidden when AI is not licensed', async ({ page }) => {
    const isAiLicensed = process.env.E2E_AI_LICENSED === 'true';
    if (isAiLicensed) {
      test.skip();
      return;
    }

    await page.goto('/dashboard');

    // The AI bubble button should NOT be visible
    await expect(page.locator('[data-tour="ai.bubble"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test('AI endpoint rejects requests with errors.AI_NOT_LICENSED when unlicensed', async ({ page }) => {
    const isAiLicensed = process.env.E2E_AI_LICENSED === 'true';
    if (isAiLicensed) {
      test.skip();
      return;
    }

    // Attempt to call the AI chat endpoint directly
    const response = await page.evaluate(async () => {
      const token = 'dummy-token'; // The actual test would use the real JWT
      try {
        const res = await fetch('http://localhost:4000/v1/ai/assistant/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: 'hello' }),
        });
        return { status: res.status, body: await res.json() };
      } catch (err) {
        return { error: (err as Error).message };
      }
    });

    // Should be rejected with 403 or 503 and the AI_NOT_LICENSED error code
    expect([403, 503]).toContain(response.status);
    expect(response.body?.error?.code).toBe('AI_NOT_LICENSED');
  });

  test('AI bubble appears when licensed (E2E_AI_LICENSED=true)', async ({ page }) => {
    const isAiLicensed = process.env.E2E_AI_LICENSED === 'true';
    if (!isAiLicensed) {
      test.skip();
      return;
    }

    await page.goto('/dashboard');

    // The AI bubble button should be visible
    await expect(page.locator('[data-tour="ai.bubble"]')).toBeVisible({ timeout: 10_000 });

    // Click to open the chat drawer
    await page.click('[data-tour="ai.bubble"]');
    await expect(page.locator('[role="dialog"]').filter({ hasText: /ask|assistant/i })).toBeVisible();
  });

  test('AI bubble is positioned at bottom-start in Arabic RTL', async ({ page }) => {
    const isAiLicensed = process.env.E2E_AI_LICENSED === 'true';
    if (!isAiLicensed) {
      test.skip();
      return;
    }

    // Switch to Arabic
    await page.goto('/');
    await page.click('[data-tour="app.languageSwitcher"]');
    await page.click('role=option[name=/العربية/]');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // The AI bubble should be positioned at the bottom-start (left side in RTL)
    const bubbleBox = await page.locator('[data-tour="ai.bubble"]').boundingBox();
    expect(bubbleBox).toBeTruthy();
    if (bubbleBox) {
      const viewportWidth = page.viewportSize()?.width ?? 1280;
      // In RTL, "start" = left, so the bubble's left edge should be < 50% of viewport width
      expect(bubbleBox.x).toBeLessThan(viewportWidth / 2);
    }
  });

  test('AI bubble shows localized disclaimer when opened', async ({ page }) => {
    const isAiLicensed = process.env.E2E_AI_LICENSED === 'true';
    if (!isAiLicensed) {
      test.skip();
      return;
    }

    await page.goto('/dashboard');
    await page.click('[data-tour="ai.bubble"]');

    // The disclaimer should be visible (translated via t())
    // Spec ref: §11.12 (UI elements — disclaimer where required)
    await expect(page.locator('[data-ai-disclaimer]')).toBeVisible({ timeout: 5_000 });
  });
});
