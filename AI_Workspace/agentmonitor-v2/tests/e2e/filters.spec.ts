import { expect, test } from '@playwright/test'

test('filter controls expose expected status options', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('timeline-search-input')).toBeVisible()

  await expect(page.getByTestId('timeline-filter-TASK_ASSIGNED')).toBeVisible()
  await expect(page.getByTestId('timeline-filter-TASK_IN_PROGRESS')).toBeVisible()
  await expect(page.getByTestId('timeline-filter-TASK_COMPLETED')).toBeVisible()
  await expect(page.getByTestId('timeline-filter-TASK_BLOCKED')).toBeVisible()
  await expect(page.getByTestId('timeline-filter-TEST_PASSED')).toBeVisible()
  await expect(page.getByTestId('timeline-filter-TEST_FAILED')).toBeVisible()
  await expect(page.getByTestId('timeline-filter-INCIDENT_OPENED')).toBeVisible()
  await expect(page.getByTestId('timeline-filter-ARTIFACT_PUBLISHED')).toBeVisible()

  await page.getByTestId('timeline-filter-INCIDENT_OPENED').click()
  await expect(page.getByText('INCIDENT_OPENED').first()).toBeVisible()
})
