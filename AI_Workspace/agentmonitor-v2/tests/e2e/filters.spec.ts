import { expect, test } from '@playwright/test'

test('filter controls expose expected status options', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByPlaceholder('Search by task ID or message...')).toBeVisible()

  await expect(page.getByRole('button', { name: 'Assigned', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'In Progress', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Blocked', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Passed', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Failed', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Incident', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Artifacts', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Incident', exact: true }).click()
  await expect(page.getByText('INCIDENT_OPENED').first()).toBeVisible()
})
