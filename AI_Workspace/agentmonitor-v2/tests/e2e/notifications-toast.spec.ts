import { expect, test } from '@playwright/test'

test('notifications toasts support pause and toggle', async ({ page }) => {
  await page.goto('/')

  const toasts = page.getByTestId('notification-toast')
  await expect(toasts.first()).toBeVisible({ timeout: 15000 })

  await page.getByTestId('notifications-bell').click()
  await expect(page.getByTestId('notifications-popover')).toBeVisible()

  await page.getByTestId('notifications-toast-pause').click()
  await page.keyboard.press('Escape')
  await expect(toasts).toHaveCount(0)

  await page.getByTestId('notifications-bell').click()
  await page.getByTestId('notifications-toast-pause').click()
  await page.keyboard.press('Escape')
  await expect(toasts.first()).toBeVisible({ timeout: 5000 })

  await page.getByTestId('notifications-bell').click()
  await page.getByTestId('notifications-toast-toggle').click()
  await page.keyboard.press('Escape')
  await expect(toasts).toHaveCount(0)
})
