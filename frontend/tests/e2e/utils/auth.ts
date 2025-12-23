import type { BrowserContext, Page } from '@playwright/test';
import { mockUser } from '../fixtures/data';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

export async function seedAuthState(page: Page, context: BrowserContext) {
  await context.addCookies([
    {
      name: 'accessToken',
      value: 'e2e-access-token',
      url: baseURL,
    },
  ]);

  const state = {
    user: mockUser,
    accessToken: 'e2e-access-token',
    refreshToken: 'e2e-refresh-token',
    isAuthenticated: true,
  };

  await page.addInitScript((persistedState) => {
    localStorage.setItem('sori-store', JSON.stringify({ state: persistedState, version: 0 }));
  }, state);
}

export async function freezeTime(page: Page, isoDate: string = '2024-01-01T09:00:00Z') {
  await page.addInitScript((fixedIso) => {
    const fixed = new Date(fixedIso);
    const OriginalDate = Date;

    class MockDate extends OriginalDate {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(fixed.getTime());
        } else {
          // @ts-expect-error - spread args for mock date
          super(...args);
        }
      }

      static now() {
        return fixed.getTime();
      }
    }

    MockDate.UTC = OriginalDate.UTC;
    MockDate.parse = OriginalDate.parse;
    MockDate.prototype = OriginalDate.prototype;

    // @ts-expect-error override for test environment
    window.Date = MockDate;
  }, isoDate);
}
