import fixture from './sample.json';
export type Source = 'all' | 'codex' | 'opencode';
export type Snapshot = typeof fixture.all;
export type Model = Snapshot['models'][number];
export type Session = Snapshot['sessions'][number];
export const sample = fixture;
export const sourceNames = { all: 'All sources', codex: 'Codex', opencode: 'OpenCode' };
export const label = (id: string) =>
  ({
    'gpt-6-astra': 'GPT-6 Astra',
    'gpt-5.6-sol': 'GPT-5.6 Sol',
    'codex-auto-review': 'Codex auto-review',
    '(unknown model)': 'Unknown model',
  })[id] ?? id;
export const money = (n: number | null) =>
  n === null
    ? 'Unpriced'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(n);
export const number = (n: number) => new Intl.NumberFormat('en-US').format(n);
export const compact = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2).replace(/0$/, '')}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(1)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : number(n);
export const date = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const cacheRate = (t: Snapshot['totals']) =>
  t.input + t.cacheRead + t.cacheWrite > 0
    ? (t.cacheRead / (t.input + t.cacheRead + t.cacheWrite)) * 100
    : null;
export const estimate = (t: Snapshot['totals']) =>
  t.cost === null && t.events === 0 ? '—' : `${money(t.cost)}${t.unpricedEvents ? '+' : ''}`;
