import { test, expect } from '@playwright/test';

test('capture AgentMonitor screenshot for V2 planning', async ({ page }) => {
  await page.goto('http://127.0.0.1:4311/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Take full page screenshot
  await page.screenshot({ path: 'test-results/agentmonitor-v1-full.png', fullPage: true });
  console.log('Full page screenshot saved');
  
  // Get page structure
  const title = await page.title();
  console.log('Page title:', title);
  
  // Get main sections
  const sections = await page.evaluate(() => {
    return {
      hero: !!document.querySelector('.hero'),
      summaryGrid: !!document.querySelector('.summary-grid'),
      agentStage: !!document.querySelector('.agent-stage'),
      timeline: !!document.querySelector('.timeline'),
      tasks: !!document.querySelector('.task-groups'),
      filters: !!document.querySelector('.filters'),
      critical: !!document.querySelector('.critical-list'),
    };
  });
  console.log('Sections found:', sections);
});
