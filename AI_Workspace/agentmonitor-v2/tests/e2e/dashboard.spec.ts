import { expect, test } from '@playwright/test'

test('dashboard overview and summary metrics render', async ({ page }) => {
  await page.goto('/')

  const hero = page.getByTestId('dashboard-hero')
  await expect(hero).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('AgentMonitor V2')).toBeVisible()

  await expect(hero.locator('.rounded-lg.border')).toHaveCount(4)
})
