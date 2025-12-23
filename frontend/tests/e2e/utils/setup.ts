import type { BrowserContext, Page } from '@playwright/test';
import { attachUiDiagnostics } from './ui-checks';
import { freezeTime, seedAuthState } from './auth';
import { installApiMocks } from './mocks';

export async function setupUiTest(page: Page, context: BrowserContext) {
  await freezeTime(page);
  await seedAuthState(page, context);
  await installApiMocks(page);

  return attachUiDiagnostics(page);
}
