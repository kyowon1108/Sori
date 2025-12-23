import { test, expect } from '@playwright/test';
import { assertImagesLoaded, assertNoUiIssues } from './utils/ui-checks';
import { setupUiTest } from './utils/setup';

test('dashboard renders with assets', async ({ page, context }) => {
  const diagnostics = await setupUiTest(page, context);

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: '대시보드', exact: true })).toBeVisible();
  await expect(page.getByText('등록된 어르신')).toBeVisible();
  await expect(page.getByRole('heading', { name: /조치 필요/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /최근 이벤트/ })).toBeVisible();

  // ActionQueue 핵심 검증
  const actionQueueSection = page.locator('text=조치 필요').first();
  await expect(actionQueueSection).toBeVisible();

  // 항목이 있으면 최소 1개 렌더링 확인, 없으면 빈 상태 확인
  const actionItems = page.locator('[aria-label*="우선순위:"]');
  const emptyState = page.locator('text=현재 조치가 필요한 항목이 없습니다');
  const hasItems = (await actionItems.count()) > 0;
  const hasEmptyState = await emptyState.isVisible();

  // 둘 중 하나는 보여야 함
  expect(hasItems || hasEmptyState).toBeTruthy();

  // 항목이 있으면 CTA 버튼도 확인
  if (hasItems) {
    const firstCTA = page.locator('a[aria-label*=":"]').first();
    await expect(firstCTA).toBeVisible();
    // 터치 타겟 크기 검증 (최소 44x44px)
    const ctaBoundingBox = await firstCTA.boundingBox();
    expect(ctaBoundingBox?.width).toBeGreaterThanOrEqual(44);
    expect(ctaBoundingBox?.height).toBeGreaterThanOrEqual(44);
  }

  await assertImagesLoaded(page);
  await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });

  await assertNoUiIssues(diagnostics);
});
