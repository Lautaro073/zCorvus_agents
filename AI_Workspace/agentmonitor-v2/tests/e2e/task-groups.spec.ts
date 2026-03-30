import { expect, test } from '@playwright/test'

test('task groups render by correlation and by agent', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Task Groups')).toBeVisible()

  await expect(page.getByRole('tab', { name: 'By Correlation' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'By Agent' })).toBeVisible()

  await page.getByRole('tab', { name: 'By Agent' }).click()
  await expect(page.getByText(/\(\d+ tasks\)/).first()).toBeVisible()

  await page.getByRole('tab', { name: 'By Correlation' }).click()
  await expect(page.getByText(/events/).first()).toBeVisible()
})
