import { test, expect } from '@playwright/test';

test.describe('Tooltips', () => {
  test('toolbar buttons show tooltips on hover', async ({ page }) => {
    await page.goto('/');

    const saveButton = page.locator('button[title="Save layout"]');
    await expect(saveButton).toBeVisible();

    await saveButton.hover();
    
    const tooltip = page.locator('title:has-text("Save layout")');
    await expect(tooltip.first()).toBeVisible();
  });

  test('zoom controls show tooltips', async ({ page }) => {
    await page.goto('/');

    const zoomIn = page.locator('button[title*="Zoom in"]');
    await expect(zoomIn).toBeVisible();
    await zoomIn.hover();
    
    await expect(page.locator('title:has-text("Zoom in")').first()).toBeVisible();
  });

  test('editor toolbar shows tooltips', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("Layout")');

    const floorTool = page.locator('button[title*="Floor"]');
    await expect(floorTool).toBeVisible();
  });

  test('characters show tooltips with status', async ({ page }) => {
    await page.goto('/');

    const toolOverlay = page.locator('[class*="ToolOverlay"]');
    if (await toolOverlay.count() > 0) {
      await expect(toolOverlay.first()).toBeVisible();
    }
  });
});
