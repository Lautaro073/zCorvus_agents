import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const label = process.argv[2] || 'snapshot';
const outDir = path.resolve('test-results/metrics-desync-triage');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

await page.goto('http://127.0.0.1:4311/monitor', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const data = await page.evaluate(() => {
  const section = document.querySelector('[data-testid="section-dashboard"]');
  const rows = [];
  if (section) {
    const cards = Array.from(section.querySelectorAll('.grid > div'));
    for (const card of cards) {
      const title = card.querySelector('.text-sm.font-medium')?.textContent?.trim() ?? '';
      const value = card.querySelector('.text-2xl.font-semibold')?.textContent?.trim() ?? '';
      const delta = card.querySelector('.text-xs.text-muted-foreground')?.textContent?.trim() ?? '';
      const polyline = card.querySelector('svg polyline')?.getAttribute('points') ?? '';
      if (title) {
        rows.push({ title, value, delta, polyline });
      }
    }
  }

  return {
    ts: new Date().toISOString(),
    title: document.title,
    cards: rows,
  };
});

const pngPath = path.join(outDir, `${label}.png`);
const jsonPath = path.join(outDir, `${label}.json`);

await page.screenshot({ path: pngPath, fullPage: true });
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

await browser.close();

console.log('saved', jsonPath);
console.log('saved', pngPath);
