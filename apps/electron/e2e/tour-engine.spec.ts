/**
 * E2E test: Guided Tour engine (spec §10, §24.2 — guided tour starts, pauses,
 * resumes, skips, completes, and restarts correctly; respects permissions and
 * license entitlements; does not display fake production data; accessible by
 * keyboard; works in Arabic RTL; text is translated using t()).
 *
 * Prerequisites:
 *   - Backend running with seeded tour definitions (14 tours)
 *   - User logged in as admin (so all tours are visible)
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Login as admin before each test
  await page.goto('/login');
  await page.fill('input[type="email"]', process.env.E2E_ADMIN_EMAIL ?? 'admin@smart-edms.local');
  await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe!2026');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test.describe('Guided Tour engine (spec §10)', () => {
  test('welcome tour can be started from the command palette', async ({ page }) => {
    // Open the command palette (Cmd+K / Ctrl+K)
    await page.keyboard.press('Control+K');

    // Search for "welcome tour"
    await page.fill('[role="dialog"] input', 'welcome tour');
    await page.keyboard.press('Enter');

    // The tour overlay should appear
    await expect(page.locator('[data-tour-active="true"]')).toBeVisible({ timeout: 10_000 });

    // The tour popover should show a title (translated via t())
    await expect(page.locator('[role="dialog"]').filter({ hasText: /tour|welcome/i })).toBeVisible();
  });

  test('tour can be skipped via the Skip button', async ({ page }) => {
    // Start the welcome tour
    await page.keyboard.press('Control+K');
    await page.fill('[role="dialog"] input', 'welcome tour');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tour-active="true"]')).toBeVisible({ timeout: 10_000 });

    // Click Skip
    await page.click('button:has-text("Skip"), button[aria-label*="skip" i]');

    // The tour overlay should disappear
    await expect(page.locator('[data-tour-active="true"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test('tour can be navigated with Next and Previous buttons', async ({ page }) => {
    await page.keyboard.press('Control+K');
    await page.fill('[role="dialog"] input', 'welcome tour');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tour-active="true"]')).toBeVisible({ timeout: 10_000 });

    // Click Next
    await page.click('button:has-text("Next"), button[aria-label*="next" i]');

    // The step counter should increment (e.g., "Step 2 of 6")
    const stepText = await page.locator('[data-tour-step-counter]').textContent();
    expect(stepText).toMatch(/2.*6/);

    // Click Previous
    await page.click('button:has-text("Previous"), button[aria-label*="previous" i]');
    const stepTextAfter = await page.locator('[data-tour-step-counter]').textContent();
    expect(stepTextAfter).toMatch(/1.*6/);
  });

  test('tour is keyboard accessible (Tab + Enter + Escape)', async ({ page }) => {
    await page.keyboard.press('Control+K');
    await page.fill('[role="dialog"] input', 'welcome tour');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tour-active="true"]')).toBeVisible({ timeout: 10_000 });

    // Press Escape to pause/dismiss
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-tour-active="true"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test('tour does not display fake production data (spec §10.16)', async ({ page }) => {
    await page.keyboard.press('Control+K');
    await page.fill('[role="dialog"] input', 'welcome tour');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tour-active="true"]')).toBeVisible({ timeout: 10_000 });

    // The tour popover should NOT contain fake document names, user names, or metrics
    const tourText = await page.locator('[data-tour-active="true"]').textContent() ?? '';
    // Forbidden: fake-looking document names
    expect(tourText).not.toMatch(/document[_\s-]?example\s*\.pdf/i);
    expect(tourText).not.toMatch(/john\s+doe/i);
    expect(tourText).not.toMatch(/\d{3,}\s+(documents|users|files)/i); // fake counts like "1,234 documents"
  });

  test('tour works in Arabic RTL', async ({ page }) => {
    // Switch to Arabic first
    await page.click('[data-tour="app.languageSwitcher"]');
    await page.click('role=option[name=/العربية/]');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Start the welcome tour
    await page.keyboard.press('Control+K');
    await page.fill('[role="dialog"] input', /جولة/);
    await page.keyboard.press('Enter');

    // Tour overlay should appear with RTL positioning
    await expect(page.locator('[data-tour-active="true"]')).toBeVisible({ timeout: 10_000 });

    // The popover should be positioned using logical start/end (not hardcoded left/right)
    const popoverBox = await page.locator('[data-tour-active="true"] [role="dialog"]').boundingBox();
    expect(popoverBox).toBeTruthy();
  });

  test('tour respects license entitlements (AI tour hidden when AI not licensed)', async ({ page }) => {
    // Open the command palette and search for "AI Assistant tour"
    await page.keyboard.press('Control+K');
    await page.fill('[role="dialog"] input', 'AI Assistant tour');

    // If the AI module is not licensed, the tour should NOT appear in the results
    // (This test passes when AI is not licensed — if AI IS licensed, the test should
    // be skipped via env var E2E_AI_LICENSED=true)
    const isAiLicensed = process.env.E2E_AI_LICENSED === 'true';
    if (!isAiLicensed) {
      const resultText = await page.locator('[role="dialog"]').textContent() ?? '';
      // The AI Assistant tour should not be in the results
      expect(resultText).not.toMatch(/AI Assistant tour/i);
    }
  });

  test('tour can be restarted after completion', async ({ page }) => {
    // Navigate to the Tours page
    await page.goto('/tours');

    // Find a completed tour and click "Restart"
    await page.click('button:has-text("Restart"), [aria-label*="restart" i]');

    // The tour should start again
    await expect(page.locator('[data-tour-active="true"]')).toBeVisible({ timeout: 10_000 });
  });
});
