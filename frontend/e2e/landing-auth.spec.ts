import { expect, test } from '@playwright/test';

test('landing page is rendered with SSR content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Internet Cepat/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Masuk' })).toBeVisible();
});
