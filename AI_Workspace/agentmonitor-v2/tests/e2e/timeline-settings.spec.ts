import { expect, test } from '@playwright/test'

test('settings controls are wired to timeline and task groups', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('sidebar-nav-settings').click()
  await expect(page.getByTestId('section-settings')).toBeVisible()

  await expect(page.getByTestId('settings-filter-panel')).toBeVisible()
  await expect(page.getByTestId('settings-agent-select')).toBeVisible()
  await expect(page.getByTestId('settings-status-select')).toBeVisible()
  await expect(page.getByTestId('settings-search-query')).toBeVisible()
  await expect(page.getByTestId('settings-quick-filters')).toBeVisible()
  await expect(page.getByTestId('settings-presets-button')).toBeVisible()

  await page.getByTestId('settings-status-select').click()
  await page.getByRole('option', { name: 'BLOCKED' }).click()

  await page.getByTestId('sidebar-nav-timeline').click()
  await expect(page).toHaveURL(/#timeline/)
  await expect(page.getByTestId('timeline-event-row')).toHaveCount(1)
})
