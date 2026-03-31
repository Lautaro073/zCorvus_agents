import { expect, test } from '@playwright/test'

test('AgentMonitor V2 smoke: dashboard renders', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('dashboard-hero')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'AgentMonitor V2' })).toBeVisible()
  await expect(page.getByTestId('timeline-panel')).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('critical-panel')).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('task-groups-panel')).toBeVisible({ timeout: 15000 })
})
