import { expect, test } from '@playwright/test'

test('clickable UX gaps are resolved', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('sidebar-nav-timeline').click()
  await expect(page).toHaveURL(/#timeline/)
  await expect(page.getByTestId('section-timeline')).toBeVisible()
  await expect(page.getByTestId('sidebar-nav-timeline')).toHaveAttribute('aria-current', 'page')

  await page.getByTestId('header-search-input').fill('frontend')
  await expect(page.getByTestId('header-search-results')).toContainText(/resultados/)
  await page.getByTestId('header-search-input').fill('')

  await page.getByRole('button', { name: /Ver detalle/i }).first().click()
  await expect(page.getByTestId('event-detail-dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByTestId('timeline-event-row').first().click()
  await expect(page.getByTestId('event-detail-dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByTestId('task-groups-tab-agent').click()
  await page.getByTestId('task-row').first().click()
  await expect(page.getByTestId('event-detail-dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /Copiar taskId/i }).first().click()
  await expect(page.getByTestId('quick-actions-copy-feedback')).toBeVisible()
})
