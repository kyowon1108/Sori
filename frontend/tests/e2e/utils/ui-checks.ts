import { expect, type Page, type Request, type Response } from '@playwright/test';

type UiDiagnostics = {
  consoleErrors: string[];
  requestFailures: string[];
  responseFailures: string[];
};

const assetExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.css'];

function isAssetUrl(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes('/_next/image')) return true;
  return assetExtensions.some((ext) => lower.includes(ext));
}

function isAssetRequest(request: Request) {
  const resourceType = request.resourceType();
  if (resourceType === 'image' || resourceType === 'stylesheet') return true;
  return isAssetUrl(request.url());
}

function isAssetResponse(response: Response) {
  return isAssetRequest(response.request());
}

export function attachUiDiagnostics(page: Page): UiDiagnostics {
  const diagnostics: UiDiagnostics = {
    consoleErrors: [],
    requestFailures: [],
    responseFailures: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') {
      diagnostics.consoleErrors.push(message.text());
    }
  });

  page.on('requestfailed', (request) => {
    if (!isAssetRequest(request)) return;
    const failure = request.failure();
    diagnostics.requestFailures.push(
      `${request.url()} (${failure?.errorText || 'unknown error'})`
    );
  });

  page.on('response', (response) => {
    if (!isAssetResponse(response)) return;
    if (response.status() >= 400) {
      diagnostics.responseFailures.push(
        `${response.request().url()} (${response.status()})`
      );
    }
  });

  return diagnostics;
}

export async function assertNoUiIssues(diagnostics: UiDiagnostics) {
  const issues: string[] = [];

  if (diagnostics.consoleErrors.length > 0) {
    issues.push(`Console errors: ${diagnostics.consoleErrors.join('; ')}`);
  }

  if (diagnostics.requestFailures.length > 0) {
    issues.push(`Request failures: ${diagnostics.requestFailures.join('; ')}`);
  }

  if (diagnostics.responseFailures.length > 0) {
    issues.push(`Response failures: ${diagnostics.responseFailures.join('; ')}`);
  }

  expect(issues, issues.join('\n')).toEqual([]);
}

export async function assertImagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete)
  );

  const brokenImages = await page.$$eval('img', (imgs) =>
    imgs
      .filter((img) => img.naturalWidth === 0)
      .map((img) => img.getAttribute('src') || 'unknown')
  );

  expect(brokenImages, `Broken images: ${brokenImages.join(', ')}`).toEqual([]);
}
