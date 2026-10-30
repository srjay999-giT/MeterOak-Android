import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.DEMO_URL || 'http://127.0.0.1:4899';
const output = new URL('../.qa/browser/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [width, height] of [[390, 844], [320, 640], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height }, acceptDownloads: true });
    page.setDefaultTimeout(10000);
    console.log(`Checking ${width} × ${height}`);
    const errors = [];
    const failedRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    const check = async (label) => {
      const bounds = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        app: document.getElementById('root').getBoundingClientRect().width,
      }));
      assert.ok(bounds.document <= width, `${label}: horizontal overflow`);
      assert.ok(bounds.app <= Math.min(width, 520), `${label}: app width`);
      return bounds;
    };
    const screenshot = (name) => page.screenshot({ path: new URL(`${name}-${width}.png`, output).pathname });
    const navigate = async (name) => {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('button', { name: new RegExp(`^${name}`) }).last().click();
      await page.getByText('Demo workspace', { exact: true }).waitFor({ state: 'hidden' });
    };
    const response = await page.goto(baseURL, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.getByRole('button', { name: 'Skip intro', exact: true }).waitFor();
    await screenshot('intro');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    await page.getByRole('heading', { name: 'Usage overview', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Appearance: portfolio. Switch appearance' }).waitFor();
    const bounds = await check('Overview');
    await screenshot('overview');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download sample CSV', exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'meteroak-sample-all.csv');
    const csv = await readFile(await download.path(), 'utf8');
    assert.ok(csv.startsWith('Source,Model,Tokens,Estimated USD\r\n'));
    assert.ok(csv.includes('gpt-6-astra'));
    assert.ok(csv.includes('Unpriced'));
    assert.ok(!csv.includes('/Users/'));

    await page.getByText('Usage over time', { exact: true }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Cost', exact: true }).last().click();
    await page.getByRole('button', { name: '7 days', exact: true }).click();
    await page.getByRole('button', { name: 'Codex auto-review', exact: true }).click();
    await page.getByText('Unpriced', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'All models', exact: true }).click();
    await page.getByRole('button', { name: 'Tokens', exact: true }).last().click();
    await page.locator('svg rect[fill="transparent"]').last().click();
    await page.getByText('Sep 25', { exact: true }).last().waitFor();
    await screenshot('chart');

    await navigate('Models');
    await page.getByLabel('Search models…', { exact: true }).fill('Astra');
    await page.getByText('749.7M', { exact: true }).waitFor();
    await screenshot('models');
    await check('Models');
    await page.getByLabel('Search models…', { exact: true }).fill('no-such-model');
    await page.getByText('No models match your search.', { exact: true }).waitFor();
    await page.getByLabel('Search models…', { exact: true }).fill('');
    await page.getByText('749.7M', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'OpenCode', exact: true }).click();
    await page.getByText('No usage in this sample for OpenCode.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'All sources', exact: true }).click();

    await navigate('Session history');
    await page.getByLabel('Search model or session…', { exact: true }).fill('SAMPLE-150');
    await page.getByRole('button', { name: 'View SAMPLE-150 details', exact: true }).click();
    await page.getByText('Session details', { exact: true }).waitFor();
    await page.getByRole('dialog').waitFor();
    await screenshot('session');
    await page.keyboard.press('Escape');
    await page.getByText('Session details', { exact: true }).waitFor({ state: 'hidden' });

    await navigate('Budgets');
    await page.getByLabel('30-day target in USD', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Save target', exact: true }).click();
    await page.getByText('Enter a target above $0 and a threshold from 1 to 100%.', { exact: true }).waitFor();
    await page.getByLabel('30-day target in USD', { exact: true }).fill('1800');
    await page.getByRole('button', { name: 'Save target', exact: true }).click();
    await page.getByText('Target saved for this visit.', { exact: true }).waitFor();
    await screenshot('budgets');
    await navigate('Insights');
    await page.getByText('Cached input', { exact: true }).waitFor();
    await screenshot('insights');
    await navigate('Connections');
    await page.getByRole('button', { name: 'OpenCode', exact: true }).click();
    await page.getByText('No usage-limit snapshots found.', { exact: true }).waitFor();
    await screenshot('connections');
    await navigate('Connectivity');
    await page.getByText('Connectivity will be added in a future version.', { exact: true }).waitFor();
    await screenshot('connectivity');
    await navigate('Budgets');
    assert.equal(await page.getByLabel('30-day target in USD', { exact: true }).inputValue(), '');
    await page.getByRole('button', { name: 'All sources', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('input[aria-label="30-day target in USD"]')?.value === '1800');
    assert.equal(await page.getByLabel('30-day target in USD', { exact: true }).inputValue(), '1800');
    await navigate('Overview');
    await page.getByRole('button', { name: 'Appearance: portfolio. Switch appearance', exact: true }).click();
    await page.getByRole('button', { name: 'Appearance: original. Switch appearance', exact: true }).waitFor();
    await screenshot('original');
    await check('Original appearance');
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByText('Demo workspace', { exact: true }).waitFor({ state: 'hidden' });
    assert.deepEqual(errors, [], 'Uncaught browser errors');
    assert.deepEqual(failedRequests, [], 'Failed browser requests');
    results.push({ width, height, bounds, screens: 7, csvDownload: true, charts: true, sourceIsolation: true, escape: true, errors, failedRequests });
    await page.close();
  }
  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await reduced.goto(baseURL);
  await reduced.getByRole('heading', { name: 'Usage overview', exact: true }).waitFor();
  assert.equal(await reduced.getByRole('button', { name: 'Skip intro', exact: true }).count(), 0);
  await reduced.close();
  await writeFile(new URL('results.json', output), JSON.stringify({ results, reducedMotion: true }, null, 2));
  console.log(JSON.stringify({ results, reducedMotion: true }, null, 2));
} catch (error) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      await page.screenshot({ path: new URL('failure.png', output).pathname });
      await writeFile(new URL('failure.txt', output), await page.locator('body').innerText());
    }
  }
  throw error;
} finally {
  await browser.close();
}
