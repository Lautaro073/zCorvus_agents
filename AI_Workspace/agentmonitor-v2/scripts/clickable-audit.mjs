import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('test-results/runtime-clickable-audit');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const result = {
  url: 'http://127.0.0.1:4311/monitor',
  steps: [],
};

await page.goto(result.url, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outDir, '01-initial.png'), fullPage: true });
result.steps.push({ step: 'load', ok: true, title: await page.title() });

const navLinks = page.locator('aside nav a');
const navCount = await navLinks.count();
for (let i = 0; i < navCount; i += 1) {
  const link = navLinks.nth(i);
  const label = (await link.innerText()).trim();
  const href = await link.getAttribute('href');
  await link.click();
  await page.waitForTimeout(100);
  const hash = await page.evaluate(() => window.location.hash);
  const targetExists = await page.evaluate((h) => {
    if (!h || !h.startsWith('#')) return false;
    return !!document.getElementById(h.slice(1));
  }, hash);
  result.steps.push({ step: 'sidebar-nav', label, href, hash, targetExists });
}

const toggleBtn = page.locator('aside button').first();
const beforeCollapsed = await page.locator('aside').evaluate((el) => el.className);
await toggleBtn.click();
await page.waitForTimeout(150);
const afterCollapsed = await page.locator('aside').evaluate((el) => el.className);
await page.screenshot({ path: path.join(outDir, '02-sidebar-collapsed.png'), fullPage: true });
result.steps.push({ step: 'sidebar-toggle', changed: beforeCollapsed !== afterCollapsed });

const bell = page.getByTestId('notifications-bell');
await bell.click();
const popoverVisible = await page
  .getByTestId('notifications-popover')
  .isVisible()
  .catch(() => false);
await page.screenshot({ path: path.join(outDir, '03-notifications.png'), fullPage: true });
result.steps.push({ step: 'notifications', popoverVisible });

const filterBtn = page.getByTestId('timeline-filter-TASK_IN_PROGRESS');
await filterBtn.click();
await page.waitForTimeout(120);
const activeFiltersVisible = await page
  .getByTestId('timeline-active-filters')
  .isVisible()
  .catch(() => false);
result.steps.push({ step: 'timeline-filter', activeFiltersVisible });

const search = page.getByTestId('timeline-search-input');
await search.fill('TASK_IN_PROGRESS');
const searchValue = await search.inputValue();
result.steps.push({ step: 'timeline-search', value: searchValue });

const headerSearch = page
  .locator('[data-testid="header-search-input"], input[placeholder="Buscar tareas..."]')
  .first();

if (await headerSearch.isVisible().catch(() => false)) {
  await headerSearch.fill('frontend');
  await page.waitForTimeout(100);
  const headerSearchResultsVisible = await page
    .locator('[data-testid="header-search-results"]')
    .isVisible()
    .catch(() => false);
  result.steps.push({
    step: 'header-search-global',
    value: 'frontend',
    resultsVisible: headerSearchResultsVisible,
  });
  await headerSearch.fill('');
}

const clusterBtn = page.locator('button:has-text("eventos a las")').first();
if ((await clusterBtn.count()) > 0) {
  await clusterBtn.click();
  await page.waitForTimeout(120);
  result.steps.push({ step: 'timeline-cluster', clicked: true });
} else {
  result.steps.push({
    step: 'timeline-cluster',
    clicked: false,
    reason: 'no clustered button rendered',
  });
}

const firstTimelineRow = page.getByTestId('timeline-event-row').first();
if ((await firstTimelineRow.count()) > 0) {
  await firstTimelineRow.click();
  await page.waitForTimeout(120);
  const timelineDetailVisible = await page
    .getByTestId('event-detail-dialog')
    .isVisible()
    .catch(() => false);
  result.steps.push({ step: 'timeline-row-click', detailVisible: timelineDetailVisible });
  if (timelineDetailVisible) {
    await page.keyboard.press('Escape');
  }
}

const tabAgent = page.getByTestId('task-groups-tab-agent');
await tabAgent.click();
await page.waitForTimeout(120);
const tabSelected = await tabAgent.getAttribute('data-state');
result.steps.push({ step: 'task-groups-tab', agentSelected: tabSelected });

const firstTaskRow = page.getByTestId('task-row').first();
if ((await firstTaskRow.count()) > 0) {
  await firstTaskRow.click();
  await page.waitForTimeout(120);
  const taskDetailVisible = await page
    .getByTestId('event-detail-dialog')
    .isVisible()
    .catch(() => false);
  result.steps.push({ step: 'task-row-click', detailVisible: taskDetailVisible });
  if (taskDetailVisible) {
    await page.keyboard.press('Escape');
  }
}

const criticalItem = page.getByTestId('critical-alert-item').first();
if ((await criticalItem.count()) > 0) {
  await criticalItem.click();
  await page.waitForTimeout(150);
  const quickResolveVisible = await page
    .getByTestId('quick-resolve-panel')
    .isVisible()
    .catch(() => false);
  await page.screenshot({ path: path.join(outDir, '04-quick-resolve.png'), fullPage: true });
  result.steps.push({ step: 'critical-panel-open', quickResolveVisible });
  const copyTaskBtn = page.getByTestId('quick-resolve-copy-task');
  const copyEnabled = await copyTaskBtn.isEnabled().catch(() => false);
  result.steps.push({ step: 'quick-resolve-copy-task', copyEnabled });
} else {
  result.steps.push({
    step: 'critical-panel-open',
    quickResolveVisible: false,
    reason: 'no alerts',
  });
}

const quickActionView = page.getByRole('button', { name: /Ver detalle/i }).first();
if ((await quickActionView.count()) > 0) {
  await quickActionView.click();
  await page.waitForTimeout(120);
  const detailVisible = await page
    .getByTestId('event-detail-dialog')
    .isVisible()
    .catch(() => false);
  result.steps.push({
    step: 'agent-quickaction-view',
    clicked: true,
    detailVisible,
  });
  if (detailVisible) {
    await page.keyboard.press('Escape');
  }
}

const quickActionCopy = page.getByRole('button', { name: /Copiar taskId/i }).first();
if ((await quickActionCopy.count()) > 0) {
  await quickActionCopy.click();
  await page.waitForTimeout(120);
  const copyFeedbackVisible = await page
    .getByTestId('quick-actions-copy-feedback')
    .isVisible()
    .catch(() => false);
  result.steps.push({ step: 'agent-quickaction-copy', copyFeedbackVisible });
}

const taskRowClickables = page.locator('[data-testid="task-groups-panel"] .cursor-pointer');
result.steps.push({ step: 'task-row-clickables', count: await taskRowClickables.count() });

await page.screenshot({ path: path.join(outDir, '05-final.png'), fullPage: true });

fs.writeFileSync(path.join(outDir, 'audit-results.json'), JSON.stringify(result, null, 2));

await browser.close();
console.log('audit saved', path.join(outDir, 'audit-results.json'));
