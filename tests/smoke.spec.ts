import { test, expect } from '@playwright/test';

test('login screen renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /connect supabase/i })).toBeVisible();
});
