import { expect, test } from '@playwright/test'

test('dashboard overview and summary metrics render', async ({ page }) => {
  await page.goto('/')

  const hero = page.locator('section').filter({ hasText: 'Operational Overview' }).first()
  await expect(hero).toBeVisible()
  await expect(page.getByText('AgentMonitor V2')).toBeVisible()

  await expect(hero.getByText('Total Events')).toBeVisible()
  await expect(hero.getByText('Active Tasks')).toBeVisible()
  await expect(hero.getByText('Blocked')).toBeVisible()
  await expect(hero.getByText('Live Throughput')).toBeVisible()
})
