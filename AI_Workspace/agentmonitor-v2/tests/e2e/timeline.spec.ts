import { expect, test } from '@playwright/test'

test('timeline supports search and status filter interactions', async ({ page }) => {
  await page.goto('/')

  const searchInput = page.getByTestId('timeline-search-input')
  await expect(searchInput).toBeVisible()

  await searchInput.fill('no-match-query-12345')
  await expect(page.getByText(/Ningun evento coincide con los filtros|No events match your filters/)).toBeVisible()

  await searchInput.fill('')
  const blockedFilter = page.getByTestId('timeline-filter-TASK_BLOCKED')
  await blockedFilter.click()

  await expect(page.getByTestId('timeline-active-filters')).toBeVisible()
  await expect(page.getByText('TASK_BLOCKED').first()).toBeVisible()
  await expect(page.getByText(/Ningun evento coincide con los filtros|No events match your filters/)).toHaveCount(0)

  await page.getByTestId('timeline-clear-filters').click()
  await expect(page.getByTestId('timeline-active-filters')).not.toBeVisible()
})
