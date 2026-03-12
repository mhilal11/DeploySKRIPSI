import { expect, test } from '@playwright/test';

test('landing page is rendered with SSR content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Platform SDM Terintegrasi')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Masuk' })).toBeVisible();
});
