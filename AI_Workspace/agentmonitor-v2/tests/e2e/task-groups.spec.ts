import { expect, test } from '@playwright/test'

test('task groups render by correlation and by agent', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('task-groups-panel')).toBeVisible({ timeout: 15000 })

  await expect(page.getByTestId('task-groups-tab-correlation')).toBeVisible()
  await expect(page.getByTestId('task-groups-tab-agent')).toBeVisible()

  await page.getByTestId('task-groups-tab-agent').click()
  await expect(page.getByText(/\(\d+ tareas\)|\(\d+ tasks\)/).first()).toBeVisible()

  await page.getByTestId('task-groups-tab-correlation').click()
  await expect(page.getByText(/eventos|events/).first()).toBeVisible()
})
