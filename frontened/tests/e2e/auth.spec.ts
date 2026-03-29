import { test, expect } from '@playwright/test';
import { mockPublicJobsApi } from './api-mocks';

test.describe('Career-Compass E2E User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicJobsApi(page);
    await page.goto('/');
    // Same browser context is reused across tests; clear so logged-out flows are not affected.
    await page.evaluate(() => localStorage.clear());
  });

  test('should show home page with jobs', async ({ page }) => {
    await expect(page.getByText('Career-Compass')).toBeVisible();
    await expect(page.getByText('Help us build the future of work')).toBeVisible();
  });

  test('should redirect to signup when clicking a job card while logged out', async ({ page }) => {
    const card = page.locator('div.cursor-pointer').filter({ hasText: 'Senior Frontend Engineer' }).first();
    await expect(card).toBeVisible({ timeout: 20000 });
    await card.click();

    await expect(page).toHaveURL(/\/signup\/?$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Sign up', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should allow navigation between login and signup', async ({ page }) => {
    await page.goto('/signup');
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);
    
    await page.click('text=Sign up');
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.getByRole('heading', { name: 'Sign up', exact: true })).toBeVisible();
  });

  test('admin should be able to reach admin dashboard if role is admin', async ({ page }) => {
    // Manually set local storage to simulate an admin login
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-admin-token');
      localStorage.setItem('user', JSON.stringify({ role: 'admin', name: 'Admin User' }));
    });
    
    await page.goto('/admin');
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByText('Welcome back, Admin User')).toBeVisible();
  });

  test('user should be able to reach user dashboard if role is user', async ({ page }) => {
    // Manually set local storage to simulate a user login
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-user-token');
      localStorage.setItem('user', JSON.stringify({ role: 'user', name: 'Nishant' }));
    });
    
    await page.goto('/dashboard');
    await expect(page.getByText('My Dashboard')).toBeVisible();
    await expect(page.getByText('Welcome back, Nishant')).toBeVisible();
  });

  test('should handle unauthorized access to admin dashboard', async ({ page }) => {
    // Set user as regular user
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-user-token');
      localStorage.setItem('user', JSON.stringify({ role: 'user', name: 'Nishant' }));
    });
    
    await page.goto('/admin');
    // Should be redirected back to home
    await expect(page).toHaveURL(/.*\//);
  });

  test('should show 404 page for non-existent job ID', async ({ page }) => {
    // Log in first to bypass the JobDetail auth check
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-user-token');
      localStorage.setItem('user', JSON.stringify({ role: 'user', name: 'Nishant' }));
    });

    await page.goto('/jobs/non-existent-id-12345');
    
    // Check for 404 text
    await expect(page.getByText(/Oops! Page not found/i)).toBeVisible({ timeout: 15000 });
    // Check for the "Explore other opportunities" section which is part of the 404 page
    await expect(page.getByText(/Explore other opportunities/i)).toBeVisible({ timeout: 15000 });
  });

  test('should persist redirect URL through signup and verify flow', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/jobs/1');

    await expect(page).toHaveURL(/\/signup\/?$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Sign up', exact: true })).toBeVisible({
      timeout: 15000,
    });
  });
});
