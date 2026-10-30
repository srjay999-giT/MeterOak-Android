import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sample = JSON.parse(await readFile(new URL('../web/src/sample.json', import.meta.url), 'utf8'));
const views = ['all', 'codex', 'opencode'];
const categories = ['input', 'cacheRead', 'cacheWrite', 'output', 'reasoning'];
const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 0.000001, `${label}: ${actual} differs from ${expected}`);

test('token totals reconcile across independently displayed categories, models, days, and sessions', () => {
  for (const name of views) {
    const { totals, models, days, sessions } = sample[name];
    assert.equal(
      categories.reduce((total, key) => total + totals[key], 0),
      totals.total,
      `${name} categories`,
    );
    assert.equal(sum(models, 'total'), totals.total, `${name} models`);
    assert.equal(sum(days, 'tokens'), totals.total, `${name} days`);
    assert.equal(sum(sessions, 'tokens'), totals.total, `${name} sessions`);
    for (const model of models) {
      assert.equal(
        categories.reduce((total, key) => total + model[key], 0),
        model.total,
        `${name}/${model.id} categories`,
      );
      assert.equal(sum(model.days, 'tokens'), model.total, `${name}/${model.id} daily tokens`);
    }
  }
});

test('known costs reconcile without treating unknown prices as zero-dollar usage', () => {
  for (const name of views) {
    const { totals, models, days, sessions } = sample[name];
    if (totals.cost !== null) {
      close(sum(models, 'cost'), totals.cost, `${name} model costs`);
      close(sum(days, 'cost'), totals.cost, `${name} daily costs`);
      close(sum(sessions, 'cost'), totals.cost, `${name} session costs`);
      close(totals.reportedCost + totals.estimatedCost, totals.cost, `${name} cost basis`);
    }
    for (const row of [...models, ...sessions]) {
      if (row.events > 0 && row.unpricedEvents === row.events) {
        assert.equal(row.cost, null, `${name}: wholly unpriced usage must remain null`);
      }
    }
    for (const model of models) {
      if (model.cost !== null) close(sum(model.days, 'cost'), model.cost, `${model.id} daily cost`);
    }
  }
  assert.ok(
    sample.all.totals.unpricedEvents > 0,
    'the preview must retain its missing-price example',
  );
});

test('event counts, pricing coverage, and active session counts stay internally consistent', () => {
  for (const name of views) {
    const { totals, models, days, sessions } = sample[name];
    assert.equal(
      totals.pricedEvents + totals.unpricedEvents,
      totals.events,
      `${name} pricing counts`,
    );
    for (const [kind, rows] of Object.entries({ models, days, sessions })) {
      assert.equal(sum(rows, 'events'), totals.events, `${name}/${kind} events`);
      assert.equal(
        sum(rows, 'unpricedEvents'),
        totals.unpricedEvents,
        `${name}/${kind} missing prices`,
      );
      for (const row of rows) assert.ok(row.unpricedEvents <= row.events);
    }
    assert.equal(sessions.length, totals.sessions, `${name} session count`);
    assert.equal(
      sessions.filter((session) => session.events > 0).length,
      totals.usageSessions,
      `${name} usage sessions`,
    );
    if (totals.events > 0)
      close(totals.coverage, totals.pricedEvents / totals.events, `${name} coverage`);
  }
});

test('source filters partition the same sample instead of duplicating or inventing usage', () => {
  for (const key of [
    ...categories,
    'total',
    'events',
    'sessions',
    'usageSessions',
    'pricedEvents',
    'unpricedEvents',
  ]) {
    assert.equal(
      sample.codex.totals[key] + sample.opencode.totals[key],
      sample.all.totals[key],
      key,
    );
  }
  for (const name of ['codex', 'opencode']) {
    assert.ok(sample[name].models.every((model) => model.source === name));
    assert.ok(sample[name].sessions.every((session) => session.source === name));
  }
  const empty = sample.opencode;
  assert.equal(empty.totals.total, 0);
  assert.equal(empty.totals.events, 0);
  assert.equal(empty.totals.cost, null);
  assert.deepEqual(empty.models, []);
  assert.deepEqual(empty.sessions, []);
  assert.ok(empty.days.every((day) => day.tokens === 0 && day.events === 0));
});

test('daily charts have one ordered bucket per day in the declared sample window', () => {
  const start = Date.parse(`${sample.window.from}T00:00:00Z`);
  const end = Date.parse(`${sample.window.to}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  assert.equal((end - start) / dayMs + 1, sample.window.days);
  for (const name of views) {
    const { days, models } = sample[name];
    assert.equal(days.length, sample.window.days);
    days.forEach((day, index) => {
      assert.equal(
        Date.parse(`${day.date}T00:00:00Z`),
        start + index * dayMs,
        `${name} day ${index}`,
      );
      assert.equal(
        sum(
          models.map((model) => model.days[index]),
          'tokens',
        ),
        day.tokens,
        `${name}/${day.date} model stacks`,
      );
    });
    for (const model of models)
      assert.deepEqual(
        model.days.map((day) => day.date),
        days.map((day) => day.date),
      );
  }
});

test('sample identities are anonymous and contain no local paths, credentials, or private content fields', () => {
  const privateKeys =
    /^(?:path|paths|root|roots|cwd|home|email|accountId|userId|deviceId|apiKey|secret|password|authorization|accessToken|refreshToken|privateKey|prompt|prompts|transcript|messages|content|label|title)$/i;
  // Limit labels describe the provider and quota window, never a person's session title.
  function inspect(value, path = 'sample') {
    if (Array.isArray(value))
      return value.forEach((item, index) => inspect(item, `${path}[${index}]`));
    if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        assert.ok(
          !privateKeys.test(key) || (key === 'label' && /^sample\.limits\[\d+\]$/.test(path)),
          `${path}.${key} is not allowed in the preview fixture`,
        );
        inspect(item, `${path}.${key}`);
      }
    } else if (typeof value === 'string') {
      assert.doesNotMatch(
        value,
        /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\|\.codex\/|\/fixtures\/|Bearer\s+|sk-[A-Za-z0-9]{12,}|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
        path,
      );
    }
  }
  inspect(sample);
  for (const name of views) {
    const ids = sample[name].sessions.map((session) => session.id);
    assert.equal(new Set(ids).size, ids.length, `${name} session ids must be unique`);
    for (const id of ids) assert.match(id, /^SAMPLE-\d+$/);
  }
});

test('sample numeric values are finite and nonnegative; recorded percentage values remain bounded', () => {
  function inspect(value) {
    if (value && typeof value === 'object') return Object.values(value).forEach(inspect);
    if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0);
  }
  inspect(sample);
  for (const limit of sample.limits) assert.ok(limit.usedPercent >= 0 && limit.usedPercent <= 100);
  for (const name of views) {
    const totals = sample[name].totals;
    const denominator = totals.input + totals.cacheRead + totals.cacheWrite;
    assert.ok(totals.coverage >= 0 && totals.coverage <= 1);
    if (denominator > 0) assert.ok(totals.cacheRead / denominator <= 1);
  }
});
