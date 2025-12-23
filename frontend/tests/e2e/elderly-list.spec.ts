import { test, expect } from '@playwright/test';
import { assertImagesLoaded, assertNoUiIssues } from './utils/ui-checks';
import { setupUiTest } from './utils/setup';

test('elderly list renders cards', async ({ page, context }) => {
  const diagnostics = await setupUiTest(page, context);

  await page.goto('/elderly');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: '어르신 관리' })).toBeVisible();
  const cards = page.locator('a[href^="/elderly/"]:not([href="/elderly/add"])');
  await expect(cards.first()).toBeVisible();

  await assertImagesLoaded(page);
  await expect(page).toHaveScreenshot('elderly-list.png', { fullPage: true });

  await assertNoUiIssues(diagnostics);
});
