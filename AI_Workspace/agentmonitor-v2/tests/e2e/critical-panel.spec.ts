import { expect, test } from '@playwright/test'

test('critical panel opens quick resolve details', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('critical-panel')).toBeVisible({ timeout: 15000 })

  const alertButton = page.getByTestId('critical-alert-item').first()
  await expect(alertButton).toBeVisible()
  await alertButton.click()

  await expect(page.getByTestId('quick-resolve-panel')).toBeVisible()
  await expect(page.getByTestId('quick-resolve-copy-task')).toBeVisible()
})
