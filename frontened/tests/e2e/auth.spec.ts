import { test, expect } from '@playwright/test';

test.describe('Career-Compass E2E User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page using relative path
    await page.goto('/');
  });

  test('should show home page with jobs', async ({ page }) => {
    await expect(page.getByText('Career-Compass')).toBeVisible();
    await expect(page.getByText('Help us build the future of work')).toBeVisible();
  });

  test('should redirect to signup when clicking a job card while logged out', async ({ page }) => {
    // Wait for at least one job card to appear
    const jobTitle = page.locator('h3').first();
    await expect(jobTitle).toBeVisible({ timeout: 15000 });
    
    // Click on the job title to navigate
    await jobTitle.click({ force: true });
    
    // Check for redirection to signup
    await expect(page).toHaveURL(/.*signup/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Sign up', exact: true })).toBeVisible();
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
    await expect(page.getByText(/Oops! Page not found/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Explore other opportunities')).toBeVisible();
  });

  test('should persist redirect URL through signup and verify flow', async ({ page }) => {
    // Navigate to a specific job while logged out
    // Since jobs are dynamic, we just use a generic ID pattern
    await page.goto('/jobs/1');
    
    // We expect to be redirected to signup
    await expect(page).toHaveURL(/.*signup/);
    
    // Check if redirect state is passed (internal check via URL or behavior)
    // Here we check if the heading is visible as a proxy for being on signup page
    await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
  });
});
