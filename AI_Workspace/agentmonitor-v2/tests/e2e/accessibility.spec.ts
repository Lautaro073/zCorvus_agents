import { expect, test } from '@playwright/test'

test('keyboard focus and enter interaction work on filters', async ({ page }) => {
  await page.goto('/')

  const searchInput = page.getByTestId('timeline-search-input')
  await searchInput.focus()
  await expect(searchInput).toBeFocused()

  await page.keyboard.type('observer')
  await expect(searchInput).toHaveValue('observer')

  const blockedFilter = page.getByTestId('timeline-filter-TASK_BLOCKED')
  await blockedFilter.focus()
  await expect(blockedFilter).toBeFocused()

  await blockedFilter.press('Enter')
  await expect(page.getByTestId('timeline-active-filters')).toBeVisible()

  const clearButton = page.getByTestId('timeline-clear-filters')
  await clearButton.focus()
  await expect(clearButton).toBeFocused()
  await clearButton.press('Enter')

  await expect(page.getByTestId('timeline-active-filters')).not.toBeVisible()
})
