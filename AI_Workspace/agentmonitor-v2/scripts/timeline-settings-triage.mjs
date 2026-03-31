import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('test-results/timeline-settings-triage');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const result = {
  url: 'http://127.0.0.1:4311/monitor',
  timeline: {},
  settings: {},
};

await page.goto(result.url, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

await page.screenshot({ path: path.join(outDir, '01-dashboard-initial.png'), fullPage: true });

const apiStats = await page.evaluate(async () => {
  const response = await fetch('/api/events');
  const payload = await response.json();
  const events = Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : [];
  let lowercaseInProgress = 0;
  let taskInProgress = 0;
  for (const event of events) {
    if (event?.status === 'in_progress') lowercaseInProgress += 1;
    if (event?.status === 'TASK_IN_PROGRESS' || event?.type === 'TASK_IN_PROGRESS') taskInProgress += 1;
  }
  return {
    total: events.length,
    lowercaseInProgress,
    taskInProgress,
  };
});

const timelineHeaderTextBefore = (await page.getByTestId('timeline-header').innerText()).trim();
const timelineRowsBefore = await page.getByTestId('timeline-event-row').count();

await page.getByTestId('timeline-filter-TASK_IN_PROGRESS').click();
await page.waitForTimeout(300);

const timelineHeaderTextAfter = (await page.getByTestId('timeline-header').innerText()).trim();
const timelineRowsAfter = await page.getByTestId('timeline-event-row').count();
const emptyTimelineVisible = await page.getByText('Ningun evento coincide con los filtros').isVisible().catch(() => false);

await page.screenshot({ path: path.join(outDir, '02-timeline-filtered-in-progress.png'), fullPage: true });

result.timeline = {
  apiStats,
  timelineHeaderTextBefore,
  timelineRowsBefore,
  timelineHeaderTextAfter,
  timelineRowsAfter,
  emptyTimelineVisible,
};

await page.getByTestId('sidebar-nav-settings').click();
await page.waitForTimeout(400);

const settingsSectionVisible = await page.getByTestId('section-settings').isVisible();
const settingsRoot = page.getByTestId('section-settings');
const hasFilterPanelTitle = await settingsRoot
  .getByText('Filtros', { exact: true })
  .isVisible()
  .catch(() => false);
const hasQuickFilters = await settingsRoot.getByText('Filtros rapidos').isVisible().catch(() => false);
const hasAgentSelect = await settingsRoot.getByText('Todos los agentes').isVisible().catch(() => false);
const hasStatusSelect = await settingsRoot.getByText('Todos los estados').isVisible().catch(() => false);
const hasPresetButton = await settingsRoot
  .getByRole('button', { name: /Presets/i })
  .isVisible()
  .catch(() => false);
const hasTaskGroupsPanel = await page.getByTestId('task-groups-panel').isVisible().catch(() => false);

await page.screenshot({ path: path.join(outDir, '03-settings-section.png'), fullPage: true });

result.settings = {
  settingsSectionVisible,
  hasFilterPanelTitle,
  hasQuickFilters,
  hasAgentSelect,
  hasStatusSelect,
  hasPresetButton,
  hasTaskGroupsPanel,
};

fs.writeFileSync(path.join(outDir, 'triage-results.json'), JSON.stringify(result, null, 2));

await browser.close();
console.log('triage saved', path.join(outDir, 'triage-results.json'));
