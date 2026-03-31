import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function normalize(statusOrType) {
  if (!statusOrType) return 'UNKNOWN';
  const key = String(statusOrType).trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    assigned: 'TASK_ASSIGNED',
    task_assigned: 'TASK_ASSIGNED',
    accepted: 'TASK_ACCEPTED',
    task_accepted: 'TASK_ACCEPTED',
    in_progress: 'TASK_IN_PROGRESS',
    inprogress: 'TASK_IN_PROGRESS',
    task_in_progress: 'TASK_IN_PROGRESS',
    completed: 'TASK_COMPLETED',
    task_completed: 'TASK_COMPLETED',
    blocked: 'TASK_BLOCKED',
    task_blocked: 'TASK_BLOCKED',
  };
  return aliases[key] || key.toUpperCase();
}

const outDir = path.resolve('test-results/timeline-settings-recheck');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const result = {
  url: 'http://127.0.0.1:4311/monitor',
  expected: {},
  observed: {},
};

await page.goto(result.url, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const apiPayload = await page.evaluate(async () => {
  const response = await fetch('/api/events');
  const payload = await response.json();
  return Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : [];
});

const inProgressExpected = apiPayload.filter(
  (event) => normalize(event.status || event.type) === 'TASK_IN_PROGRESS'
).length;
const blockedExpected = apiPayload.filter(
  (event) => normalize(event.status || event.type) === 'TASK_BLOCKED'
).length;

result.expected.inProgress = inProgressExpected;
result.expected.blocked = blockedExpected;

await page.getByTestId('sidebar-nav-timeline').click();
await page.getByTestId('timeline-filter-TASK_IN_PROGRESS').click();
await page.waitForTimeout(300);

const timelineHeaderInProgress = await page.getByTestId('timeline-header').innerText();
const inProgressObserved = Number((timelineHeaderInProgress.match(/(\d+)\s+eventos/) || [])[1] || 0);
result.observed.timelineInProgress = inProgressObserved;

await page.screenshot({ path: path.join(outDir, '01-timeline-in-progress.png'), fullPage: true });

await page.getByTestId('sidebar-nav-settings').click();
await page.getByTestId('settings-status-select').click();
await page.getByRole('option', { name: 'BLOCKED' }).click();
await page.waitForTimeout(250);

await page.screenshot({ path: path.join(outDir, '02-settings-blocked-selected.png'), fullPage: true });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);

await page.getByTestId('sidebar-nav-settings').click();
const statusValuePersisted = await page
  .getByTestId('settings-status-select')
  .textContent()
  .then((x) => (x || '').trim());
result.observed.persistedStatusText = statusValuePersisted;

await page.getByTestId('sidebar-nav-timeline').click();
await page.waitForTimeout(300);
const timelineHeaderBlocked = await page.getByTestId('timeline-header').innerText();
const blockedObserved = Number((timelineHeaderBlocked.match(/(\d+)\s+eventos/) || [])[1] || 0);
result.observed.timelineBlocked = blockedObserved;

await page.screenshot({ path: path.join(outDir, '03-after-reload-blocked.png'), fullPage: true });

fs.writeFileSync(path.join(outDir, 'recheck-results.json'), JSON.stringify(result, null, 2));

await browser.close();

console.log('recheck saved', path.join(outDir, 'recheck-results.json'));
