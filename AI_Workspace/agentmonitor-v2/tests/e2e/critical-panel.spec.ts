import { expect, test } from '@playwright/test'

test('critical panel opens quick resolve details', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Critical Panel', { exact: true })).toBeVisible()

  const alertButton = page.getByRole('button', { name: /Incident|Blocked|Test Failed/ }).first()
  await expect(alertButton).toBeVisible()
  await alertButton.click()

  await expect(page.getByText('Quick Resolve')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy taskId' })).toBeVisible()
})
