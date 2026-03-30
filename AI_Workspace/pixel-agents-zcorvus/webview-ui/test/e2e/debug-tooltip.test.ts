import { test } from '@playwright/test';

test('debug page content and take screenshot', async ({ page }) => {
  await page.goto('/');
  
  // Wait a bit for page to load
  await page.waitForTimeout(2000);
  
  // Get page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Get body content
  const bodyText = await page.locator('body').innerText();
  console.log('Body text (first 500 chars):', bodyText.substring(0, 500));
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-screenshot.png' });
  console.log('Screenshot saved to test-results/debug-screenshot.png');
  
  // Check if there's a canvas (office view)
  const canvas = page.locator('canvas');
  const canvasCount = await canvas.count();
  console.log('Canvas elements found:', canvasCount);
});
