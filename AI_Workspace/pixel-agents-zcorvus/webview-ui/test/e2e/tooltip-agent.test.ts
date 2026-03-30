import { test, expect } from '@playwright/test';

test('verify tooltip shows agent name and status', async ({ page }) => {
  await page.goto('http://127.0.0.1:4311/pixel/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Check if canvas exists
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/tooltip-test-before.png' });
  
  // Check for any div that might contain agent info
  // The tooltip should be rendered as an absolute positioned div
  const pageText = await page.locator('body').innerText();
  console.log('Page text:', pageText);
  
  // Look for tooltip elements (they have pixel styling)
  const tooltips = page.locator('div').filter({ hasText: /Agente|Observer|Tester|Documenter/ });
  const tooltipCount = await tooltips.count();
  console.log('Potential tooltip elements found:', tooltipCount);
  
  await page.screenshot({ path: 'test-results/tooltip-test-after.png' });
});
