import { test } from '@playwright/test';

test('verify tooltip with alwaysShowOverlay enabled', async ({ page }) => {
  await page.goto('http://127.0.0.1:4311/pixel/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Take initial screenshot
  await page.screenshot({ path: 'test-results/01-initial.png' });
  console.log('01 - Initial state - no tooltip visible');
  
  // Find and click Settings button
  const settingsBtn = page.locator('button').filter({ hasText: 'Settings' });
  await settingsBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/02-settings-open.png' });
  console.log('02 - Settings opened');
  
  // Click on "Always Show Labels" 
  const alwaysShowBtn = page.locator('button').filter({ hasText: 'Always Show Labels' });
  const btnCount = await alwaysShowBtn.count();
  console.log('Always Show Labels buttons:', btnCount);
  
  if (btnCount > 0) {
    await alwaysShowBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/03-always-show-clicked.png' });
    console.log('03 - Always Show Labels clicked');
  }
  
  // Close settings (click X button)
  const closeBtn = page.locator('button').filter({ hasText: 'X' });
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }
  
  // Final screenshot with tooltip visible
  await page.screenshot({ path: 'test-results/04-final-with-tooltip.png' });
  console.log('04 - Final state - tooltip should be visible now');
  
  // Check if any text contains agent names
  const finalText = await page.locator('body').innerText();
  console.log('Final page text:', finalText);
});
