import { test, expect } from '@playwright/test';
import { assertImagesLoaded, assertNoUiIssues } from './utils/ui-checks';
import { setupUiTest } from './utils/setup';

test('elderly detail shows profile and layout', async ({ page, context }) => {
  const diagnostics = await setupUiTest(page, context);

  await page.goto('/elderly');
  await page.waitForLoadState('networkidle');

  const firstCard = page.locator('a[href^="/elderly/"]:not([href="/elderly/add"])').first();
  await expect(firstCard).toBeVisible();

  // Get the name from the first card to handle sorting (high-risk first)
  const elderlyName = await firstCard.locator('h3').textContent();
  expect(elderlyName).toBeTruthy();

  const href = await firstCard.getAttribute('href');
  expect(href).toBeTruthy();
  await page.goto(href || '/elderly/1');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: elderlyName || '' })).toBeVisible();
  await expect(page.getByRole('button', { name: '요약' })).toBeVisible();

  const hasOverflow = await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth + 2;
  });
  expect(hasOverflow).toBeFalsy();

  await assertImagesLoaded(page);
  await expect(page).toHaveScreenshot('elderly-detail.png', { fullPage: true });

  await assertNoUiIssues(diagnostics);
});
