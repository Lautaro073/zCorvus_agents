import { expect, test } from '@playwright/test'

test('AgentMonitor V2 smoke: dashboard renders', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Operational Overview')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AgentMonitor V2' })).toBeVisible()
  await expect(page.getByText('Live orchestration status across MCP agents')).toBeVisible()
})
