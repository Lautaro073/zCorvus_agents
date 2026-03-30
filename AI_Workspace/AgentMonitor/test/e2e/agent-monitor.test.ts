import { test, expect } from '@playwright/test';

test.describe('AgentMonitor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('monitor loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Monitor de Agentes/);
  });

  test('hero section is visible', async ({ page }) => {
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();
  });

  test('pixel experience button is present', async ({ page }) => {
    const pixelButton = page.locator('a.button:has-text("Pixel Experience")');
    await expect(pixelButton).toBeVisible();
    await expect(pixelButton).toHaveAttribute('href', 'http://127.0.0.1:4311/pixel/');
  });
});
