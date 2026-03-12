import { expect, test } from '@playwright/test';

test('landing page is rendered with SSR content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Internet Cepat/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Masuk' })).toBeVisible();
});

test('landing to login and back does not replay splash', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Masuk' }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Selamat Datang Kembali/i })).toBeVisible();

  await page.getByRole('link', { name: /Kembali ke Beranda/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Internet Cepat/i })).toBeVisible();
  await expect(page.getByTestId('landing-splash-overlay')).toHaveCount(0);
});
