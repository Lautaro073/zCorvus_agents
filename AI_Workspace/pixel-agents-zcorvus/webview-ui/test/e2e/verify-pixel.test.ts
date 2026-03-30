import { test } from '@playwright/test';

test('verify pixel-agents page loads correctly', async ({ page }) => {
  // Navigate directly with full URL
  await page.goto('http://127.0.0.1:4311/pixel/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Get page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check for canvas
  const canvas = page.locator('canvas');
  const canvasCount = await canvas.count();
  console.log('Canvas elements found:', canvasCount);
  
  // Get HTML to see what's rendered
  const html = await page.content();
  console.log('HTML length:', html.length);
  
  // Check if root has content
  const rootContent = await page.locator('#root').innerHTML();
  console.log('Root content length:', rootContent.length);
  console.log('Root content (first 500 chars):', rootContent.substring(0, 500));
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/pixel-screenshot.png' });
});
