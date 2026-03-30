import { expect, test } from '@playwright/test'

test('keyboard focus and enter interaction work on filters', async ({ page }) => {
  await page.goto('/')

  const searchInput = page.getByPlaceholder('Search by task ID or message...')
  await searchInput.focus()
  await expect(searchInput).toBeFocused()

  await page.keyboard.type('observer')
  await expect(searchInput).toHaveValue('observer')

  const blockedFilter = page.getByRole('button', { name: 'Blocked', exact: true })
  await blockedFilter.focus()
  await expect(blockedFilter).toBeFocused()

  await blockedFilter.press('Enter')
  await expect(page.getByText('Active filters:')).toBeVisible()

  const clearButton = page.getByRole('button', { name: 'Clear all', exact: true })
  await clearButton.focus()
  await expect(clearButton).toBeFocused()
  await clearButton.press('Enter')

  await expect(page.getByText('Active filters:')).not.toBeVisible()
})
