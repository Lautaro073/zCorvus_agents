import { expect, test } from '@playwright/test'

test('timeline supports search and status filter interactions', async ({ page }) => {
  await page.goto('/')

  const searchInput = page.getByPlaceholder('Search by task ID or message...')
  await expect(searchInput).toBeVisible()

  await searchInput.fill('no-match-query-12345')
  await expect(page.getByText('No events match your filters')).toBeVisible()

  await searchInput.fill('')
  const blockedFilter = page.getByRole('button', { name: 'Blocked', exact: true })
  await blockedFilter.click()

  await expect(page.getByText('Active filters:')).toBeVisible()
  await expect(page.getByText('TASK_BLOCKED').first()).toBeVisible()

  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(page.getByText('Active filters:')).not.toBeVisible()
})
