import type { Page } from '@playwright/test';

const MOCK_JOB = {
  id: '1',
  title: 'Senior Frontend Engineer',
  teamOrDepartment: 'Engineering',
  location: 'Remote',
  shortDescription: 'Build amazing UIs',
  fullDescription: 'Full description of the job.',
  status: 'public',
  postedAt: new Date().toISOString(),
};

/**
 * Stubs public GET /jobs and GET /jobs/:id so Playwright E2E does not need a live API or MongoDB.
 * Matches any origin (VITE_API_URL, Render default, localhost).
 */
export async function mockPublicJobsApi(page: Page) {
  await page.route('**/*', async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') {
      await route.continue();
      return;
    }
    // Do not hijack HTML navigations (e.g. GET /jobs/1 for the SPA shell); only stub fetch/XHR to the API.
    if (req.resourceType() === 'document') {
      await route.continue();
      return;
    }
    let pathname: string;
    try {
      pathname = new URL(req.url()).pathname;
    } catch {
      await route.continue();
      return;
    }
    const segments = pathname.split('/').filter(Boolean);
    const j = segments.lastIndexOf('jobs');
    if (j === -1) {
      await route.continue();
      return;
    }
    if (j > 0 && segments[j - 1] === 'admin') {
      await route.continue();
      return;
    }

    if (segments.length === j + 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_JOB]),
      });
      return;
    }

    if (segments.length === j + 2) {
      const id = segments[j + 1]!;
      if (id === 'non-existent-id-12345') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: '{}',
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_JOB, id }),
      });
      return;
    }

    await route.continue();
  });
}
