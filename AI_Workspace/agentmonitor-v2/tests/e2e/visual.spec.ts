import { expect, test } from '@playwright/test'

test.describe('@visual AgentMonitor V2 visual baselines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('dashboard visual baseline', async ({ page }) => {
    const hero = page.getByTestId('dashboard-hero')
    await expect(hero).toBeVisible()
    await hero.scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot('dashboard-hero-clip.png', {
      clip: {
        x: 230,
        y: 56,
        width: 1030,
        height: 260,
      },
      maxDiffPixelRatio: 0.05,
      maxDiffPixels: 1200,
    })
  })

  test('timeline visual baseline', async ({ page }) => {
    const timelineHeader = page.getByTestId('timeline-header')
    await expect(timelineHeader).toBeVisible()
    await timelineHeader.scrollIntoViewIfNeeded()
    await expect(timelineHeader).toHaveScreenshot('timeline-header.png', { maxDiffPixelRatio: 0.02 })
  })

  test('filters visual baseline', async ({ page }) => {
    const filters = page.getByTestId('timeline-status-filters')
    await expect(filters).toBeVisible()
    await filters.scrollIntoViewIfNeeded()
    await expect(filters).toHaveScreenshot('filters-status-row.png', { maxDiffPixelRatio: 0.02 })
  })

  test('task groups visual baseline', async ({ page }) => {
    const taskGroupsHeader = page.getByTestId('task-groups-header')
    await expect(taskGroupsHeader).toBeVisible()
    await taskGroupsHeader.scrollIntoViewIfNeeded()
    await expect(taskGroupsHeader).toHaveScreenshot('task-groups-header.png', { maxDiffPixelRatio: 0.02 })
  })

  test('critical panel visual baseline', async ({ page }) => {
    const criticalHeader = page.getByTestId('critical-panel-header')
    await expect(criticalHeader).toBeVisible()
    await criticalHeader.scrollIntoViewIfNeeded()
    await expect(criticalHeader).toHaveScreenshot('critical-panel-header.png', { maxDiffPixelRatio: 0.02 })
  })
})
