import type { Page, Route } from '@playwright/test';
import { mockCallsList, mockElderlyList, mockPairingStatus, mockUser } from '../fixtures/data';

function jsonResponse(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data }),
  });
}

export async function installApiMocks(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await jsonResponse(route, mockUser);
  });

  await page.route('**/api/elderly**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/pairing-status')) {
      await jsonResponse(route, mockPairingStatus);
      return;
    }

    const match = path.match(/\/api\/elderly\/(\d+)/);
    if (match) {
      const id = Number(match[1]);
      const elderly = mockElderlyList.find((item) => item.id === id) || mockElderlyList[0];
      await jsonResponse(route, elderly);
      return;
    }

    await jsonResponse(route, {
      items: mockElderlyList,
      total: mockElderlyList.length,
      skip: 0,
      limit: 100,
    });
  });

  await page.route('**/api/calls**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    const match = path.match(/\/api\/calls\/(\d+)/);
    if (match) {
      const id = Number(match[1]);
      const call = mockCallsList.find((item) => item.id === id) || mockCallsList[0];
      await jsonResponse(route, call);
      return;
    }

    await jsonResponse(route, {
      items: mockCallsList,
      total: mockCallsList.length,
      skip: 0,
      limit: 100,
    });
  });
}
