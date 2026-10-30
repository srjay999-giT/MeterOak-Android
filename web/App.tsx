import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Icon, IconName, Mark, ProgressArc } from './src/brand';
import {
  cacheRate,
  compact,
  date,
  estimate,
  label,
  money,
  number,
  sample,
  Session,
  Snapshot,
  Source,
  sourceNames,
} from './src/data';

type Page =
  'overview' | 'models' | 'sessions' | 'budgets' | 'insights' | 'connections' | 'connectivity';
type Appearance = 'portfolio' | 'original';
type Metric = 'tokens' | 'cost';
type Budget = { amount: number; threshold: number };
type Budgets = Partial<Record<Source, Budget | null>>;
const navigation: Array<[Page, string]> = [
  ['overview', 'Overview'],
  ['models', 'Models'],
  ['sessions', 'Session history'],
  ['budgets', 'Budgets'],
  ['insights', 'Insights'],
  ['connections', 'Connections'],
  ['connectivity', 'Connectivity'],
];
const portfolio = {
  paper: '#f1f3ed',
  surface: '#ffffff',
  ink: '#253d33',
  muted: '#647766',
  line: '#d3ddcf',
  accent: '#28533f',
  soft: '#eaf0e8',
  sidebar: '#163d2f',
  brass: '#ae8d46',
  model: ['#285b45', '#ae8d46', '#7a9389', '#b6b6a1'],
  serif: true,
};
const original = {
  ...portfolio,
  paper: '#f7f8fc',
  ink: '#26283c',
  muted: '#71798d',
  line: '#e3e7ef',
  accent: '#6756d6',
  soft: '#f1eefc',
  sidebar: '#ffffff',
  brass: '#6756d6',
  model: ['#6556db', '#399c91', '#93a1b8', '#b6b6c4'],
  serif: false,
};
type Theme = typeof portfolio;
const ThemeContext = createContext<Theme>(portfolio);
const useTheme = () => useContext(ThemeContext);
const modelColor = (id: string, theme: Theme) =>
  theme.model[
    id === 'gpt-6-astra' ? 0 : id === 'gpt-5.6-sol' ? 1 : id === 'codex-auto-review' ? 2 : 3
  ];

function Copy({
  children,
  muted = false,
  style,
  ...rest
}: React.ComponentProps<typeof Text> & { muted?: boolean }) {
  const t = useTheme();
  return (
    <Text {...rest} style={[styles.text, { color: muted ? t.muted : t.ink }, style]}>
      {children}
    </Text>
  );
}
function Panel({
  children,
  title,
  subtitle,
  action,
  hero = false,
}: {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  hero?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.panel,
        { borderColor: t.line, backgroundColor: hero && t.serif ? '#fafbf6' : t.surface },
        hero && { borderTopWidth: 3, borderTopColor: t.brass },
      ]}
    >
      {title && (
        <View style={styles.panelHead}>
          <View style={styles.flex}>
            <Copy style={[styles.panelTitle, hero && t.serif && styles.serifTitle]}>{title}</Copy>
            {subtitle && (
              <Copy muted style={styles.caption}>
                {subtitle}
              </Copy>
            )}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}
function Button({
  children,
  onPress,
  primary = false,
  icon,
  accessibilityLabel,
}: {
  children: string;
  onPress: () => void;
  primary?: boolean;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: t.line,
          backgroundColor: primary ? t.accent : t.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon && <Icon name={icon} size={17} color={primary ? '#fff' : t.accent} />}
      <Copy style={{ color: primary ? '#fff' : t.accent, fontWeight: '600', fontSize: 13 }}>
        {children}
      </Copy>
    </Pressable>
  );
}
function IconButton({
  name,
  onPress,
  label: description,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description}
      onPress={onPress}
      hitSlop={4}
      style={styles.iconButton}
    >
      <Icon name={name} color={t.accent} />
    </Pressable>
  );
}
function Segments<T extends string>({
  values,
  selected,
  onSelect,
}: {
  values: Array<[T, string]>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segments, { backgroundColor: t.soft }]}>
      {values.map(([key, name]) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === key }}
          onPress={() => onSelect(key)}
          style={[styles.segment, selected === key && { backgroundColor: t.surface }]}
        >
          <Copy
            numberOfLines={1}
            style={{
              color: selected === key ? t.accent : t.muted,
              fontWeight: selected === key ? '700' : '400',
              fontSize: 12,
            }}
          >
            {name}
          </Copy>
        </Pressable>
      ))}
    </View>
  );
}
function Meter({ percent, color }: { percent: number; color?: string }) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.min(100, Math.max(0, Math.round(percent))),
      }}
      style={[styles.meter, { backgroundColor: t.soft }]}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, percent))}%`,
          height: '100%',
          borderRadius: 2,
          backgroundColor: color ?? t.accent,
        }}
      />
    </View>
  );
}
function Row({ name, value }: { name: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: t.line }]}>
      <Copy muted style={styles.flex}>
        {name}
      </Copy>
      <Copy style={styles.rowValue}>{value}</Copy>
    </View>
  );
}
function Badge({ children }: { children: string }) {
  const t = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: t.soft }]}>
      <Copy style={{ color: t.accent, fontSize: 10, fontWeight: '700' }}>{children}</Copy>
    </View>
  );
}
function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const t = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.line }]}>
      <Icon name="search" color={t.muted} size={18} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        autoCorrect={false}
        style={[styles.input, { color: t.ink }]}
      />
    </View>
  );
}
function Empty({ children = 'No usage in this sample for OpenCode.' }: { children?: string }) {
  return (
    <View style={styles.empty}>
      <Copy muted>{children}</Copy>
    </View>
  );
}

function ModelsPanel({ data, onNavigate }: { data: Snapshot; onNavigate: (page: Page) => void }) {
  const [metric, setMetric] = useState<Metric>('tokens');
  const t = useTheme();
  const models = [...data.models].sort((a, b) =>
    metric === 'tokens' ? b.total - a.total : (b.cost ?? -1) - (a.cost ?? -1),
  );
  const total = models.reduce((sum, m) => sum + (metric === 'tokens' ? m.total : (m.cost ?? 0)), 0);
  return (
    <Panel
      hero
      title="Usage by model"
      subtitle="Your recorded models, individually"
      action={
        <IconButton name="arrow" label="View all models" onPress={() => onNavigate('models')} />
      }
    >
      <View style={styles.inlineControls}>
        <Segments
          values={[
            ['tokens', 'Tokens'],
            ['cost', 'Cost'],
          ]}
          selected={metric}
          onSelect={setMetric}
        />
        <Copy muted style={styles.caption}>
          {metric === 'tokens' ? 'Share of recorded tokens' : 'Share of priced cost'}
        </Copy>
      </View>
      {models.length ? (
        models.map((m) => {
          const value = metric === 'tokens' ? m.total : m.cost;
          const share = total > 0 && value !== null ? (value / total) * 100 : 0;
          return (
            <View key={m.id} style={styles.modelBar}>
              <View style={styles.row}>
                <View style={styles.labelWithDot}>
                  <View style={[styles.dot, { backgroundColor: modelColor(m.id, t) }]} />
                  <Copy numberOfLines={1} style={styles.modelName}>
                    {label(m.id)}
                  </Copy>
                </View>
                <Copy style={styles.bold}>
                  {metric === 'tokens' ? compact(m.total) : money(m.cost)}
                </Copy>
              </View>
              <Copy muted style={styles.modelId}>
                {m.id}
              </Copy>
              <Meter percent={share} color={modelColor(m.id, t)} />
              <View style={styles.row}>
                <Copy muted style={styles.caption}>
                  {sourceNames[m.source as Source]} · {number(m.events)} events
                </Copy>
                <Copy muted style={styles.caption}>
                  {value === null ? 'No matching price' : `${share.toFixed(1)}%`}
                </Copy>
              </View>
            </View>
          );
        })
      ) : (
        <Empty />
      )}
      <Button
        children={`View all ${models.length} model records`}
        onPress={() => onNavigate('models')}
        icon="arrow"
      />
    </Panel>
  );
}
function Stats({ data }: { data: Snapshot }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const a = data.totals;
  const reuse = cacheRate(a);
  const stats = [
    [
      'Standard API estimate',
      estimate(a),
      `${number(a.unpricedEvents)} events not priced`,
      'budgets',
    ],
    [
      'Total tokens',
      compact(a.total),
      `${compact(a.output)} output · ${compact(a.reasoning)} reasoning`,
      'models',
    ],
    ['Usage events', number(a.events), `Across ${number(a.usageSessions)} sessions`, 'sessions'],
    [
      'Input cache reuse',
      reuse === null ? '—' : `${reuse.toFixed(1)}%`,
      `${compact(a.cacheRead)} cached input`,
      'refresh',
    ],
  ];
  return (
    <View style={styles.statsGrid}>
      {stats.map(([name, value, note, icon], index) => (
        <View
          key={name}
          style={[
            styles.stat,
            {
              backgroundColor:
                t.serif && index === 0 ? '#244b38' : t.serif && index === 3 ? '#e7eddc' : t.surface,
              borderColor: t.line,
            },
          ]}
        >
          <Icon
            name={icon as IconName}
            color={t.serif && index === 0 ? '#c6d4bb' : t.muted}
            size={17}
          />
          <Copy muted style={[styles.statLabel, t.serif && index === 0 && { color: '#c6d4bb' }]}>
            {name}
          </Copy>
          <Copy
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.statValue,
              {
                fontSize: Math.min(
                  26,
                  Math.max(16, (Math.min(width, 740) - 102) / (1.12 * value.length)),
                ),
              },
              t.serif && index === 0 && { color: '#f1efdd' },
            ]}
          >
            {value}
          </Copy>
          <Copy muted style={[styles.statNote, t.serif && index === 0 && { color: '#c6d4bb' }]}>
            {note}
          </Copy>
        </View>
      ))}
    </View>
  );
}
function Chart({ data }: { data: Snapshot }) {
  const t = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const [metric, setMetric] = useState<Metric>('tokens');
  const [days, setDays] = useState<'30' | '7'>('30');
  const [chosen, setChosen] = useState<number | null>(null);
  const [model, setModel] = useState('all');
  const visibleDays = data.days.slice(-Number(days));
  const selectedModel = data.models.find((m) => m.id === model);
  const values = visibleDays.map((d) => ({
    ...d,
    value: selectedModel
      ? (selectedModel.days.find((v) => v.date === d.date)?.[metric] ?? null)
      : d[metric],
  }));
  const max = Math.max(1, ...values.map((v) => v.value ?? 0));
  const [width, setWidth] = useState(300);
  const plotWidth = width - 46;
  const plotHeight = 150;
  const barWidth = Math.max(2, plotWidth / values.length - 3);
  useEffect(() => {
    setChosen(null);
    setModel('all');
  }, [data]);
  return (
    <Panel title="Usage over time" subtitle="Daily usage · Sample local dates">
      <View style={[styles.row, viewportWidth < 350 && styles.chartControlsStack]}>
        <Segments
          selected={metric}
          onSelect={setMetric}
          values={[
            ['tokens', 'Tokens'],
            ['cost', 'Cost'],
          ]}
        />
        <Segments
          selected={days}
          onSelect={(v) => {
            setDays(v);
            setChosen(null);
          }}
          values={[
            ['30', '30 days'],
            ['7', '7 days'],
          ]}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartFilters}>
        <View style={styles.chips}>
          {[['all', 'All models'], ...data.models.map((m) => [m.id, label(m.id)])].map(
            ([id, name]) => (
              <Pressable
                key={id}
                onPress={() => setModel(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: model === id }}
                style={[
                  styles.chip,
                  { backgroundColor: model === id ? t.soft : t.surface, borderColor: t.line },
                ]}
              >
                <Copy style={{ fontSize: 11, color: model === id ? t.accent : t.muted }}>
                  {name}
                </Copy>
              </Pressable>
            ),
          )}
        </View>
      </ScrollView>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 210 }}
        accessibilityLabel={`${days}-day ${metric} chart. Select a bar for details.`}
      >
        <Svg width="100%" height={205}>
          {[0, 0.5, 1].map((part) => (
            <React.Fragment key={part}>
              <Line
                x1={40}
                y1={15 + (1 - part) * plotHeight}
                x2={width - 4}
                y2={15 + (1 - part) * plotHeight}
                stroke={t.line}
              />
              <SvgText
                x={34}
                y={19 + (1 - part) * plotHeight}
                textAnchor="end"
                fill={t.muted}
                fontSize={9}
              >
                {metric === 'tokens' ? compact(max * part) : `$${Math.round(max * part)}`}
              </SvgText>
            </React.Fragment>
          ))}
          {values.map((day, index) => {
            const x = 43 + (index * plotWidth) / values.length;
            let base = 165;
            const members =
              model === 'all' ? data.models : data.models.filter((m) => m.id === model);
            return (
              <React.Fragment key={day.date}>
                {members.map((m) => {
                  const value = m.days.find((v) => v.date === day.date)?.[metric] ?? 0;
                  const height = (value / max) * plotHeight;
                  base -= height;
                  return (
                    <Rect
                      key={m.id}
                      x={x}
                      y={base}
                      width={barWidth}
                      height={height}
                      fill={modelColor(m.id, t)}
                      opacity={chosen !== null && chosen !== index ? 0.35 : 1}
                    />
                  );
                })}
                <Rect
                  x={x - 1}
                  y={10}
                  width={plotWidth / values.length}
                  height={160}
                  fill="transparent"
                  onPress={() => setChosen(index)}
                />
              </React.Fragment>
            );
          })}
          <SvgText x={43} y={191} fill={t.muted} fontSize={10}>
            {date(values[0]?.date ?? '2026-08-27')}
          </SvgText>
          <SvgText x={width - 5} y={191} textAnchor="end" fill={t.muted} fontSize={10}>
            {date(values.at(-1)?.date ?? '2026-09-25')}
          </SvgText>
        </Svg>
      </View>
      <View style={[styles.chartDetail, { backgroundColor: t.soft }]}>
        <Copy style={styles.caption}>
          {chosen !== null ? date(values[chosen].date) : `${days} days shown · Tap a bar`}
        </Copy>
        <Copy style={styles.bold}>
          {chosen !== null
            ? metric === 'tokens'
              ? `${compact(values[chosen].value ?? 0)} tokens`
              : money(values[chosen].value)
            : metric === 'tokens'
              ? `${compact(values.reduce((s, d) => s + (d.value ?? 0), 0))} tokens`
              : selectedModel?.cost === null
                ? 'Unpriced'
                : money(values.reduce((s, d) => s + (d.value ?? 0), 0))}
        </Copy>
      </View>
      <View style={styles.legend}>
        {data.models
          .filter((m) => m.total > 0)
          .map((m) => (
            <View key={m.id} style={styles.labelWithDot}>
              <View style={[styles.dot, { backgroundColor: modelColor(m.id, t) }]} />
              <Copy muted style={styles.caption}>
                {label(m.id)}
              </Copy>
            </View>
          ))}
      </View>
      {metric === 'cost' && data.totals.unpricedEvents > 0 && (
        <Copy muted style={styles.caption}>
          Known prices only. Unpriced usage is excluded.
        </Copy>
      )}
    </Panel>
  );
}
function Breakdown({ data }: { data: Snapshot }) {
  const t = useTheme();
  const a = data.totals;
  const values: Array<[string, number, string]> = [
    ['Input', a.input, t.model[0]],
    ['Cache read', a.cacheRead, t.model[1]],
    ['Output', a.output, t.model[2]],
    ['Reasoning', a.reasoning, t.model[3]],
    ['Cache write', a.cacheWrite, t.muted],
  ];
  const circumference = 2 * Math.PI * 61;
  let offset = 0;
  return (
    <Panel title="Token breakdown" subtitle="Every part of your context">
      <View style={styles.donutWrap}>
        <Svg width={160} height={160} viewBox="0 0 160 160">
          <Circle cx={80} cy={80} r={61} stroke={t.soft} strokeWidth={17} fill="none" />
          {values.map(([name, value, color]) => {
            const dash = a.total ? (value / a.total) * circumference : 0;
            const current = offset;
            offset += dash;
            return (
              <Circle
                key={name}
                cx={80}
                cy={80}
                r={61}
                fill="none"
                stroke={color}
                strokeWidth={17}
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={-current}
                rotation={-90}
                origin="80,80"
              />
            );
          })}
        </Svg>
        <View pointerEvents="none" style={styles.donutCenter}>
          <Copy style={{ fontSize: 25, fontWeight: '600' }}>{compact(a.total)}</Copy>
          <Copy muted style={styles.caption}>
            total tokens
          </Copy>
        </View>
      </View>
      {values.map(([name, value, color]) => (
        <View key={name} style={styles.detailRow}>
          <View style={styles.labelWithDot}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Copy muted>{name}</Copy>
          </View>
          <Copy style={styles.bold}>{compact(value)}</Copy>
        </View>
      ))}
    </Panel>
  );
}
function SessionList({
  data,
  onSelect,
  compactView = false,
  onNavigate,
}: {
  data: Snapshot;
  onSelect: (session: Session) => void;
  compactView?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [count, setCount] = useState(12);
  const sessions = [...data.sessions]
    .filter((s) => `${s.model} ${s.id}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  useEffect(() => setCount(12), [data, search]);
  return (
    <Panel
      title={compactView ? 'Recent sessions' : 'Session history'}
      subtitle={
        compactView
          ? 'A closer look at the sample activity'
          : `${number(sessions.length)} sessions in the sample snapshot`
      }
      action={
        compactView ? (
          <IconButton name="arrow" label="View session history" onPress={() => onNavigate?.()} />
        ) : undefined
      }
    >
      {!compactView && (
        <Search value={search} onChange={setSearch} placeholder="Search model or session…" />
      )}
      {sessions.slice(0, compactView ? 4 : count).map((s) => (
        <Pressable
          key={s.id}
          accessibilityRole="button"
          accessibilityLabel={`View ${s.id} details`}
          onPress={() => onSelect(s)}
          style={({ pressed }) => [
            styles.session,
            { borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <View style={[styles.sourceIcon, { backgroundColor: t.soft }]}>
            <Copy style={{ color: t.accent, fontWeight: '600' }}>
              {s.source === 'codex' ? 'C' : 'O'}
            </Copy>
          </View>
          <View style={styles.flex}>
            <Copy style={styles.bold}>{label(s.model)}</Copy>
            <Copy muted style={styles.caption}>
              {s.id} · {date(s.startedAt)}
            </Copy>
            <Copy muted style={styles.caption}>
              {compact(s.tokens)} tokens
            </Copy>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Copy style={styles.bold}>
              {money(s.cost)}
              {s.cost !== null && s.unpricedEvents > 0 ? '+' : ''}
            </Copy>
            <Icon name="arrow" size={16} color={t.muted} />
          </View>
        </Pressable>
      ))}
      {!sessions.length && (
        <Empty children={search ? 'No sessions match your search.' : undefined} />
      )}
      {!compactView && count < sessions.length && (
        <Button
          onPress={() => setCount(count + 12)}
          children={`Show more · ${count} of ${sessions.length}`}
        />
      )}
    </Panel>
  );
}
function ModelsPage({ data }: { data: Snapshot }) {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Metric>('tokens');
  const models = [...data.models]
    .filter((m) =>
      `${label(m.id)} ${m.id} ${m.source}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (sort === 'tokens' ? b.total - a.total : (b.cost ?? -1) - (a.cost ?? -1)));
  return (
    <>
      <Panel title="Model records" subtitle="One record per model and source">
        <View style={styles.summaryStrip}>
          <View>
            <Copy style={styles.summaryNumber}>{data.models.length}</Copy>
            <Copy muted style={styles.caption}>
              Model records
            </Copy>
          </View>
          <View>
            <Copy style={styles.summaryNumber}>{compact(data.totals.total)}</Copy>
            <Copy muted style={styles.caption}>
              Recorded tokens
            </Copy>
          </View>
        </View>
        <Search value={search} onChange={setSearch} placeholder="Search models…" />
        <Segments
          selected={sort}
          onSelect={setSort}
          values={[
            ['tokens', 'Most tokens'],
            ['cost', 'Highest cost'],
          ]}
        />
      </Panel>
      {models.map((m) => (
        <Panel
          key={m.id}
          title={label(m.id)}
          subtitle={m.id}
          action={<Badge>{sourceNames[m.source as Source]}</Badge>}
        >
          <View style={styles.summaryStrip}>
            <View>
              <Copy style={styles.summaryNumber}>{compact(m.total)}</Copy>
              <Copy muted style={styles.caption}>
                Tokens
              </Copy>
            </View>
            <View>
              <Copy style={styles.summaryNumber}>{money(m.cost)}</Copy>
              <Copy muted style={styles.caption}>
                API estimate
              </Copy>
            </View>
          </View>
          <Meter
            percent={data.totals.total ? (m.total / data.totals.total) * 100 : 0}
            color={modelColor(m.id, t)}
          />
          <Row name="Usage events" value={number(m.events)} />
          <Row name="Sessions" value={number(m.sessions)} />
          <Row name="Input / cache read" value={`${compact(m.input)} / ${compact(m.cacheRead)}`} />
          <Row name="Output / reasoning" value={`${compact(m.output)} / ${compact(m.reasoning)}`} />
          {m.unpricedEvents > 0 && (
            <Copy muted style={styles.caption}>
              {number(m.unpricedEvents)} events have no matching price.
            </Copy>
          )}
        </Panel>
      ))}
      {!models.length && (
        <Panel>
          <Empty children={search ? 'No models match your search.' : undefined} />
        </Panel>
      )}
    </>
  );
}
function BudgetPage({
  data,
  source,
  budgets,
  setBudgets,
}: {
  data: Snapshot;
  source: Source;
  budgets: Budgets;
  setBudgets: (value: Budgets) => void;
}) {
  const t = useTheme();
  const budget = budgets[source];
  const [amount, setAmount] = useState('2000');
  const [threshold, setThreshold] = useState('80');
  const [message, setMessage] = useState('');
  useEffect(() => {
    setAmount(budget ? String(budget.amount) : '');
    setThreshold(String(budget?.threshold ?? 80));
  }, [source, budget]);
  useEffect(() => setMessage(''), [source]);
  const cost = data.totals.cost ?? 0;
  const used = budget ? (cost / budget.amount) * 100 : 0;
  return (
    <>
      <Panel
        title="Sample 30-day cost target"
        subtitle={sourceNames[source]}
        action={
          <Badge>
            {budget
              ? used >= budget.threshold
                ? 'Threshold reached'
                : 'Target active'
              : 'No target'}
          </Badge>
        }
      >
        <Copy muted>
          Keep a personal target for the API-equivalent cost of your recorded usage.
        </Copy>
        <Copy style={styles.bigValue}>{estimate(data.totals)}</Copy>
        <Copy muted style={styles.caption}>
          Known cost · Sample 30 days
        </Copy>
        <Meter percent={used} />
        <Row
          name={budget ? `${Math.round(used)}% of target or more` : 'No target set'}
          value={budget ? money(budget.amount) : '—'}
        />
        {budget && <Row name="Warning threshold" value={`${budget.threshold}%`} />}
        <Copy muted style={styles.caption}>
          This is an estimate, not an invoice. Targets do not stop usage or billing.
        </Copy>
      </Panel>
      <Panel title="Set your cost target" subtitle="Try a target for this preview">
        <Copy muted style={styles.fieldLabel}>
          30-day target (USD)
        </Copy>
        <TextInput
          accessibilityLabel="30-day target in USD"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={[styles.fieldInput, { borderColor: t.line, color: t.ink }]}
          placeholder="e.g. 2000"
          placeholderTextColor={t.muted}
        />
        <Copy muted style={styles.fieldLabel}>
          Warning threshold (%)
        </Copy>
        <TextInput
          accessibilityLabel="Warning threshold percentage"
          keyboardType="decimal-pad"
          value={threshold}
          onChangeText={setThreshold}
          style={[styles.fieldInput, { borderColor: t.line, color: t.ink }]}
        />
        <Button
          primary
          children="Save target"
          onPress={() => {
            const a = Number(amount),
              b = Number(threshold);
            if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b < 1 || b > 100)
              return setMessage('Enter a target above $0 and a threshold from 1 to 100%.');
            setBudgets({ ...budgets, [source]: { amount: a, threshold: b } });
            setMessage('Target saved for this visit.');
          }}
        />
        {budget && (
          <Button
            children="Remove target"
            onPress={() => {
              setBudgets({ ...budgets, [source]: null });
              setMessage('Target removed.');
            }}
          />
        )}
        {!!message && (
          <Copy accessibilityLiveRegion="polite" style={styles.noticeText}>
            {message}
          </Copy>
        )}
        <Copy muted style={styles.caption}>
          Preview settings last until the app closes. Sample totals remain fixed.
        </Copy>
      </Panel>
    </>
  );
}
function Insights({ data, navigate }: { data: Snapshot; navigate: (page: Page) => void }) {
  const a = data.totals;
  const reuse = cacheRate(a);
  const top = [...data.models].sort((x, y) => (y.cost ?? 0) - (x.cost ?? 0))[0];
  const recent = data.days.slice(-7);
  const daily = recent.reduce((s, d) => s + (d.cost ?? 0), 0) / 7;
  return (
    <>
      <Panel title="Cached input" subtitle="REUSE">
        <Copy style={styles.bigValue}>{reuse === null ? '—' : `${reuse.toFixed(1)}%`}</Copy>
        <Copy muted>Share of input tokens read from cache</Copy>
        <Meter percent={reuse ?? 0} />
        <Row name="Cache read" value={`${compact(a.cacheRead)} tokens`} />
        <Row
          name="All input, including cache"
          value={compact(a.input + a.cacheRead + a.cacheWrite)}
        />
        <Copy muted style={styles.caption}>
          This measures recorded reuse; it does not estimate potential savings.
        </Copy>
      </Panel>
      <Panel title="Largest priced model" subtitle="COST CONCENTRATION">
        {top && a.cost ? (
          <>
            <Copy style={styles.bigValue}>{Math.round(((top.cost ?? 0) / a.cost) * 100)}%</Copy>
            <Copy style={styles.bold}>{label(top.id)}</Copy>
            <Row name="Known model cost" value={money(top.cost)} />
            <Button children="Review models" onPress={() => navigate('models')} icon="arrow" />
          </>
        ) : (
          <Empty />
        )}
      </Panel>
      <Panel
        title="Pricing coverage"
        subtitle="DATA QUALITY"
        action={<Badge>{a.unpricedEvents ? 'Partial' : a.events ? 'Complete' : 'No usage'}</Badge>}
      >
        <Copy style={styles.bigValue}>
          {a.coverage === null || a.events === 0 ? '—' : `${(a.coverage * 100).toFixed(1)}%`}
        </Copy>
        <Copy muted>Recorded usage events with a known cost</Copy>
        <Meter percent={(a.coverage ?? 0) * 100} />
        <Row name="Events without a price" value={number(a.unpricedEvents)} />
        <Copy muted style={styles.caption}>
          Unknown pricing is left unpriced. Known cost may understate the full estimate.
        </Copy>
      </Panel>
      <Panel title="What cost includes" subtitle="READING YOUR NUMBERS">
        <Row name="Cost reported by tools" value={money(a.reportedCost)} />
        <Row name="Estimated from model prices" value={money(a.estimatedCost)} />
        <Row name="Known cost" value={estimate(a)} />
        <Copy muted>
          Estimates apply available model prices to recorded tokens. Check your provider for the
          amount actually billed.
        </Copy>
      </Panel>
      <Panel title="30-day cost run rate" subtitle="RECENT PACE" action={<Badge>Projection</Badge>}>
        <Copy style={styles.bigValue}>
          {money(daily * 30)}
          {a.unpricedEvents ? '+' : ''}
        </Copy>
        <Copy muted>Priced usage projected at the same recent pace</Copy>
        <Row name="Daily average · Recent 7 days" value={money(daily)} />
        <Copy muted style={styles.caption}>
          A projection from sample activity, not a forecast of your bill.
        </Copy>
      </Panel>
    </>
  );
}
function Connections({ source }: { source: Source }) {
  const limits = source === 'opencode' ? [] : sample.limits;
  return (
    <>
      {sample.sources
        .filter((s) => source === 'all' || s.id === source)
        .map((s) => (
          <Panel
            key={s.id}
            title={sourceNames[s.id as Source]}
            subtitle={`Historical sample records for ${sourceNames[s.id as Source]}.`}
            action={<Badge>Sample</Badge>}
          >
            <Row name="Sessions found" value={number(s.sessions)} />
            <Row name="Files found / scanned" value={`${s.files} / ${s.scannedFiles}`} />
            <Row name="Duplicate usage records removed" value={number(s.duplicateUsageEvents)} />
            <Row name="Extra session files merged" value={number(s.duplicateSessionFiles)} />
            <Row name="Failed files" value={number(s.failedFiles)} />
          </Panel>
        ))}
      <Panel
        title="Recorded usage limits"
        subtitle="Codex sample snapshots · Not a live quota check"
      >
        {limits.length ? (
          limits.map((l, i) => (
            <View key={i} style={{ marginBottom: 18 }}>
              <Row name={l.label} value={`${Math.round(l.usedPercent)}% used`} />
              <Meter percent={l.usedPercent} />
              <Copy muted style={styles.caption}>
                Recorded {date(l.ts)}
              </Copy>
            </View>
          ))
        ) : (
          <Empty children="No usage-limit snapshots found." />
        )}
      </Panel>
    </>
  );
}
function Connectivity() {
  const t = useTheme();
  return (
    <Panel>
      <View style={styles.connectivity}>
        <View style={[styles.phoneCircle, { backgroundColor: t.soft }]}>
          <Icon name="connectivity" size={40} color={t.accent} />
        </View>
        <View>
          <Badge>Coming later</Badge>
        </View>
        <Copy style={[styles.panelTitle, { textAlign: 'center' }]}>
          Your laptop’s usage, on your phone.
        </Copy>
        <Copy muted style={{ textAlign: 'center', maxWidth: 280 }}>
          Connectivity will be added in a future version.
        </Copy>
        <View style={[styles.smallRule, { backgroundColor: t.line }]} />
        <Copy muted style={{ textAlign: 'center', fontSize: 12 }}>
          This preview uses sample data only. No account, QR code, or connection is needed.
        </Copy>
      </View>
    </Panel>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const { width, height } = useWindowDimensions();
  const size = Math.min(240, width * 0.56, height * 0.31);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 9650);
      setProgress(p);
      if (p === 1) {
        clearInterval(timer);
        Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(onDone);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [fade, onDone]);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) onDone();
    });
  }, [onDone]);
  return (
    <Animated.View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, styles.intro, { opacity: fade }]}
    >
      <SafeAreaView style={styles.flex}>
        <View style={styles.introBrand}>
          <Mark size={28} color="#10191b" />
          <Text style={styles.introWordmark}>MeterOak</Text>
        </View>
        <View
          style={styles.introCenter}
          accessibilityLabel={`Opening preview, ${Math.round(progress * 100)} percent`}
        >
          <Mark size={size} color="#121b1d" thin progress={progress} />
          <View style={{ height: 22 }} />
          <ProgressArc progress={progress} width={Math.min(width - 66, 282)} />
          <Text style={styles.introLoading}>Loading</Text>
          <Text style={styles.introTagline}>Bringing your usage in focus</Text>
        </View>
        <Pressable
          testID="skip-intro"
          accessibilityLabel="Skip intro"
          accessibilityRole="button"
          onPress={onDone}
          style={styles.skip}
        >
          <Text style={styles.introLoading}>Skip intro →</Text>
          <Text style={[styles.introLoading, { fontSize: 10, marginTop: 6 }]}>
            Offline preview · Sample data
          </Text>
        </Pressable>
      </SafeAreaView>
    </Animated.View>
  );
}
function Application() {
  const [budgets, setBudgets] = useState<Budgets>({ all: { amount: 2000, threshold: 80 } });
  const [appearance, setAppearance] = useState<Appearance>('portfolio');
  const [page, setPage] = useState<Page>('overview');
  const [source, setSource] = useState<Source>('all');
  const [menu, setMenu] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [pricing, setPricing] = useState(false);
  const [intro, setIntro] = useState(true);
  const [toast, setToast] = useState('');
  const closeIntro = React.useCallback(() => setIntro(false), []);
  const scroll = useRef<ScrollView>(null);
  const theme = appearance === 'portfolio' ? portfolio : original;
  const data = sample[source] as Snapshot;
  const title = navigation.find(([key]) => key === page)![1];
  const navigate = (next: Page) => {
    setPage(next);
    setMenu(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  const subtitles: Record<Page, string> = {
    overview: 'Understand your AI usage. Make every token count.',
    models: 'See which models do the work, and what that work costs.',
    sessions: 'Explore the usage behind your conversations and coding sessions.',
    budgets: 'Keep your estimated usage cost within a target you choose.',
    insights: 'Useful signals from the usage you have already recorded.',
    connections: 'Explore the usage sources in this sample snapshot.',
    connectivity: 'Your laptop’s usage, on your phone. You control the connection.',
  };
  const exportData = async () => {
    try {
      if (Platform.OS === 'web') {
        const rows = [
          ['Source', 'Model', 'Tokens', 'Estimated USD'],
          ...data.models.map((model) => [
            model.source,
            model.id,
            model.total,
            model.cost ?? 'Unpriced',
          ]),
        ];
        const csv =
          rows
            .map((row) =>
              row
                .map((value) => {
                  const text = String(value);
                  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
                })
                .join(','),
            )
            .join('\r\n') + '\r\n';
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `meteroak-sample-${source}.csv`;
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
          URL.revokeObjectURL(url);
        }
        return;
      }
      await Share.share({
        title: 'MeterOak sample usage',
        message: `MeterOak · Sample data only\nSource,Model,Tokens,Estimated USD\n${data.models.map((m) => `${m.source},${m.id},${m.total},${m.cost ?? 'Unpriced'}`).join('\n')}\nEstimates are not billing records.`,
      });
    } catch {
      setToast('Sharing is unavailable on this device.');
    }
  };
  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar
        barStyle={
          intro ? 'dark-content' : appearance === 'portfolio' ? 'light-content' : 'dark-content'
        }
        backgroundColor={intro ? '#fcfbf8' : theme.sidebar}
      />
      <SafeAreaView
        accessibilityElementsHidden={intro}
        importantForAccessibility={intro ? 'no-hide-descendants' : 'auto'}
        style={[styles.app, { backgroundColor: theme.paper }]}
        edges={['left', 'right', 'bottom']}
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: theme.sidebar }}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.sidebar,
                borderBottomColor: appearance === 'portfolio' ? '#3c5d4a' : theme.line,
              },
            ]}
          >
            <Pressable
              onPress={() => setMenu(true)}
              accessibilityRole="button"
              accessibilityLabel="Open navigation"
              style={styles.iconButton}
            >
              <Icon name="menu" color={appearance === 'portfolio' ? '#e7ecdf' : theme.ink} />
            </Pressable>
            <View style={styles.headerBrand}>
              <Mark size={27} color={appearance === 'portfolio' ? '#dec68d' : '#142e43'} />
              <Copy
                style={{
                  color: appearance === 'portfolio' ? '#f2f4ea' : theme.ink,
                  fontSize: 21,
                  fontWeight: '800',
                  letterSpacing: -0.7,
                }}
              >
                MeterOak
              </Copy>
            </View>
            <View
              style={[
                styles.previewBadge,
                { borderColor: appearance === 'portfolio' ? '#60745a' : theme.line },
              ]}
            >
              <Copy
                style={{
                  fontSize: 9,
                  letterSpacing: 1,
                  color: appearance === 'portfolio' ? '#cbd8c4' : theme.muted,
                }}
              >
                PREVIEW
              </Copy>
            </View>
          </View>
        </SafeAreaView>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.main}
        >
          <View style={styles.breadcrumb}>
            <Copy muted style={styles.caption}>
              Demo / {title}
            </Copy>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Appearance: ${appearance}. Switch appearance`}
              onPress={() => setAppearance(appearance === 'portfolio' ? 'original' : 'portfolio')}
              style={styles.appearance}
            >
              <Copy style={{ color: theme.accent, fontSize: 11 }}>
                {appearance === 'portfolio' ? 'Portfolio' : 'Original'} ↕
              </Copy>
            </Pressable>
          </View>
          <Copy style={[styles.eyebrow, { color: theme.muted }]}>YOUR AI, IN PERSPECTIVE</Copy>
          <Copy
            accessibilityRole="header"
            style={[styles.pageTitle, theme.serif && styles.serifPage]}
          >
            {page === 'overview' ? 'Usage overview' : title}
          </Copy>
          <Copy muted style={styles.subtitle}>
            {subtitles[page]}
          </Copy>
          <View
            style={[styles.previewNotice, { backgroundColor: theme.soft, borderColor: theme.line }]}
          >
            <Icon name="shield" size={16} color={theme.accent} />
            <Copy muted style={[styles.caption, styles.flex]}>
              <Copy style={{ fontSize: 11, fontWeight: '700' }}>Demo · sample data.</Copy> No local
              history or AI accounts are accessed.
            </Copy>
          </View>
          {page !== 'connectivity' && (
            <>
              <Segments
                values={[
                  ['all', 'All sources'],
                  ['codex', 'Codex'],
                  ['opencode', 'OpenCode'],
                ]}
                selected={source}
                onSelect={setSource}
              />
              <View style={styles.filterMeta}>
                <View>
                  <Copy style={styles.caption}>Sample 30 days</Copy>
                  <Copy muted style={{ fontSize: 10 }}>
                    Aug 27 – Sep 25, 2026
                  </Copy>
                </View>
                <View style={styles.row}>
                  <IconButton
                    name="refresh"
                    label="Reload sample data"
                    onPress={() => setToast('Sample data reloaded.')}
                  />
                  <IconButton
                    name="download"
                    label={Platform.OS === 'web' ? 'Download sample CSV' : 'Share sample CSV text'}
                    onPress={exportData}
                  />
                </View>
              </View>
            </>
          )}
          {page === 'overview' && (
            <>
              {theme.serif && <ModelsPanel data={data} onNavigate={navigate} />}
              <Stats data={data} />
              <Chart data={data} />
              {!theme.serif && <ModelsPanel data={data} onNavigate={navigate} />}
              <Breakdown data={data} />
              <Panel title="Sample usage sources" subtitle="Tools represented in this snapshot">
                {sample.sources.map((s) => (
                  <Pressable
                    key={s.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setSource(s.id as Source);
                      navigate('connections');
                    }}
                  >
                    <Row
                      name={sourceNames[s.id as Source]}
                      value={`${number(s.sessions)} sessions →`}
                    />
                  </Pressable>
                ))}
              </Panel>
              <SessionList
                data={data}
                onSelect={setSession}
                compactView
                onNavigate={() => navigate('sessions')}
              />
            </>
          )}
          {page === 'models' && <ModelsPage data={data} />}
          {page === 'sessions' && <SessionList data={data} onSelect={setSession} />}
          {page === 'budgets' && (
            <BudgetPage data={data} source={source} budgets={budgets} setBudgets={setBudgets} />
          )}
          {page === 'insights' && <Insights data={data} navigate={navigate} />}
          {page === 'connections' && <Connections source={source} />}
          {page === 'connectivity' && <Connectivity />}
          <View style={[styles.footer, { borderTopColor: theme.line }]}>
            <Copy muted style={styles.caption}>
              MeterOak · Your AI, in perspective.
            </Copy>
            <Copy muted style={[styles.caption, { textAlign: 'center' }]}>
              Standard API estimates are not paid charges.
            </Copy>
            <Pressable
              onPress={() => setPricing(true)}
              accessibilityRole="button"
              style={styles.footerButton}
            >
              <Copy style={{ color: theme.accent, fontSize: 12 }}>How estimates work ↗</Copy>
            </Pressable>
          </View>
        </ScrollView>
        <View
          style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.line }]}
        >
          {(
            [
              ['overview', 'Overview'],
              ['models', 'Models'],
              ['sessions', 'Sessions'],
              ['menu', 'More'],
            ] as const
          ).map(([key, name]) => {
            const active =
              key === page ||
              (key === 'menu' && !['overview', 'models', 'sessions'].includes(page));
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => (key === 'menu' ? setMenu(true) : navigate(key))}
                style={styles.bottomItem}
              >
                <Icon name={key} color={active ? theme.accent : theme.muted} size={19} />
                <Copy
                  style={{
                    color: active ? theme.accent : theme.muted,
                    fontSize: 10,
                    fontWeight: active ? '700' : '400',
                  }}
                >
                  {name}
                </Copy>
              </Pressable>
            );
          })}
        </View>
        {!!toast && (
          <View style={[styles.toast, { backgroundColor: theme.ink }]}>
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: '#fff', textAlign: 'center', fontSize: 13 }}
            >
              {toast}
            </Text>
          </View>
        )}
      </SafeAreaView>
      <Modal visible={menu} animationType="slide" transparent onRequestClose={() => setMenu(false)}>
        <View style={styles.scrim}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Close navigation"
            onPress={() => setMenu(false)}
          />
          <SafeAreaView style={[styles.drawer, { backgroundColor: theme.sidebar }]}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
              <View style={[styles.row, { marginBottom: 26 }]}>
                <View style={styles.headerBrand}>
                  <Mark size={32} color={theme.serif ? '#dec68d' : '#142e43'} />
                  <Copy
                    style={{
                      color: theme.serif ? '#fff' : theme.ink,
                      fontSize: 24,
                      fontWeight: '800',
                    }}
                  >
                    MeterOak
                  </Copy>
                </View>
                <Pressable
                  onPress={() => setMenu(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close navigation"
                  style={styles.iconButton}
                >
                  <Icon name="close" color={theme.serif ? '#d8e2d4' : theme.ink} />
                </Pressable>
              </View>
              <View
                style={[
                  styles.drawerWorkspace,
                  { backgroundColor: theme.serif ? '#244b3c' : theme.soft },
                ]}
              >
                <Copy style={{ color: theme.serif ? '#e7ecdf' : theme.ink, fontWeight: '600' }}>
                  Demo workspace
                </Copy>
                <Copy style={{ color: theme.serif ? '#b7c6b9' : theme.muted, fontSize: 11 }}>
                  Sample analytics · Offline preview
                </Copy>
              </View>
              {navigation.map(([key, name], i) => (
                <React.Fragment key={key}>
                  {(i === 0 || i === 5) && (
                    <Text
                      style={[styles.navLabel, { color: theme.serif ? '#a1bcab' : theme.muted }]}
                    >
                      {i === 0 ? 'WORKSPACE' : 'MANAGE'}
                    </Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: page === key }}
                    onPress={() => navigate(key)}
                    style={[
                      styles.drawerItem,
                      page === key && { backgroundColor: theme.serif ? '#e7ebd8' : theme.soft },
                    ]}
                  >
                    <Icon
                      name={key}
                      size={19}
                      color={page === key ? theme.accent : theme.serif ? '#c1d0c4' : theme.muted}
                    />
                    <Copy
                      style={{
                        color: page === key ? theme.accent : theme.serif ? '#c1d0c4' : theme.muted,
                        fontWeight: page === key ? '700' : '400',
                        fontSize: 14,
                      }}
                    >
                      {name}
                    </Copy>
                    {key === 'connectivity' && (
                      <Text
                        style={{
                          marginLeft: 'auto',
                          color: theme.serif ? '#bacbad' : theme.muted,
                          fontSize: 9,
                        }}
                      >
                        LATER
                      </Text>
                    )}
                  </Pressable>
                </React.Fragment>
              ))}
              <Text style={[styles.navLabel, { color: theme.serif ? '#a1bcab' : theme.muted }]}>
                APPEARANCE
              </Text>
              <Segments
                values={[
                  ['portfolio', 'Portfolio'],
                  ['original', 'Original'],
                ]}
                selected={appearance}
                onSelect={setAppearance}
              />
              <View
                style={[
                  styles.drawerWorkspace,
                  { backgroundColor: theme.serif ? '#1e4535' : theme.soft, marginTop: 28 },
                ]}
              >
                <Icon name="shield" color={theme.serif ? '#bdc58f' : theme.accent} />
                <Copy style={{ color: theme.serif ? '#dbe6d7' : theme.ink, fontWeight: '600' }}>
                  Sample data only.
                </Copy>
                <Copy
                  style={{
                    color: theme.serif ? '#aec4b3' : theme.muted,
                    fontSize: 11,
                    lineHeight: 18,
                  }}
                >
                  This preview never reads your history or AI accounts. No connectivity is enabled.
                </Copy>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
      <Modal
        visible={!!session || pricing}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSession(null);
          setPricing(false);
        }}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Close details"
            onPress={() => {
              setSession(null);
              setPricing(false);
            }}
          />
          <SafeAreaView style={[styles.sheet, { backgroundColor: theme.paper }]} edges={['bottom']}>
            <ScrollView contentContainerStyle={{ padding: 22 }}>
              <View style={styles.row}>
                <Copy style={styles.panelTitle}>
                  {pricing ? 'How estimates work' : 'Session details'}
                </Copy>
                <IconButton
                  name="close"
                  label="Close details"
                  onPress={() => {
                    setSession(null);
                    setPricing(false);
                  }}
                />
              </View>
              {session && (
                <>
                  <Copy style={[styles.serifTitle, { marginVertical: 12 }]}>
                    {label(session.model)}
                  </Copy>
                  <Badge>{session.id}</Badge>
                  <Row name="Source" value={sourceNames[session.source as Source]} />
                  <Row name="Started" value={date(session.startedAt)} />
                  <Row name="Tokens" value={number(session.tokens)} />
                  <Row
                    name="API cost"
                    value={`${money(session.cost)}${session.cost !== null && session.unpricedEvents ? '+' : ''}`}
                  />
                  <Row name="Usage events" value={number(session.events)} />
                  <Row name="Unpriced events" value={number(session.unpricedEvents)} />
                  <Row name="Tool calls" value={number(session.toolCalls)} />
                  <Copy muted style={{ marginTop: 16 }}>
                    A sample session. No conversation content is included.
                  </Copy>
                </>
              )}
              {pricing && (
                <>
                  <Copy style={{ marginVertical: 20 }}>
                    Estimate = (uncached input × input rate + cache reads × cache-read rate + cache
                    writes × cache-write rate + output including reasoning × output rate) ÷
                    1,000,000.
                  </Copy>
                  <Copy muted>
                    Rates are applied per million tokens. Reasoning is counted with output for
                    pricing. Missing prices remain unpriced.
                  </Copy>
                  <View style={{ height: 20 }} />
                  <Copy muted>
                    These are historical sample estimates. They do not include a verified invoice,
                    subscription, credits, or all possible tool fees.
                  </Copy>
                  <View style={{ height: 20 }} />
                  <Badge>Sample · September 25, 2026</Badge>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
      {intro && <Intro onDone={closeIntro} />}
    </ThemeContext.Provider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Application />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  text: { fontSize: 13, lineHeight: 20 },
  caption: { fontSize: 11, lineHeight: 17 },
  bold: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 4,
    borderBottomWidth: 1,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  previewBadge: {
    marginLeft: 'auto',
    marginRight: 9,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  main: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    width: '100%',
    maxWidth: 740,
    alignSelf: 'center',
  },
  breadcrumb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appearance: { minHeight: 40, justifyContent: 'center', paddingLeft: 12 },
  eyebrow: { fontSize: 8, letterSpacing: 1.5, fontWeight: '600', lineHeight: 14 },
  pageTitle: { fontSize: 30, lineHeight: 39, fontWeight: '700', letterSpacing: -0.9 },
  serifPage: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
    fontSize: 35,
    lineHeight: 43,
    letterSpacing: -1,
  },
  subtitle: { fontSize: 12, lineHeight: 19, marginTop: 3, marginBottom: 15, maxWidth: 440 },
  previewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    padding: 11,
    borderRadius: 5,
    marginBottom: 14,
  },
  segments: {
    flexDirection: 'row',
    minWidth: Platform.OS === 'web' ? 140 : 120,
    flexShrink: 1,
    padding: 3,
    borderRadius: 5,
    gap: 1,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
  },
  filterMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  panel: { padding: 17, borderWidth: 1, borderRadius: 6, marginBottom: 14 },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  panelTitle: { fontSize: 16, lineHeight: 23, fontWeight: '600', letterSpacing: -0.3 },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  inlineControls: { alignItems: 'flex-start', gap: 6, marginBottom: 16 },
  modelBar: { marginBottom: 22 },
  labelWithDot: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  modelName: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  modelId: { fontSize: 10, marginTop: 2, marginBottom: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  meter: { height: 6, borderRadius: 2, marginVertical: 9, overflow: 'hidden' },
  button: {
    minHeight: 45,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 4,
    marginTop: 6,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  stat: {
    width: '48.4%',
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    minHeight: 151,
  },
  statLabel: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  statValue: {
    fontSize: 26,
    lineHeight: 35,
    fontWeight: '600',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  statNote: { fontSize: 10, lineHeight: 15, marginTop: 5 },
  chartControlsStack: { flexDirection: 'column', alignItems: 'stretch' },
  chartFilters: { marginVertical: 12 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
  },
  chartDetail: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minHeight: 43,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000000',
    paddingVertical: 9,
  },
  rowValue: {
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '52%',
    fontVariant: ['tabular-nums'],
  },
  donutWrap: { alignSelf: 'center', width: 160, height: 160, marginBottom: 14 },
  donutCenter: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sourceIcon: {
    width: 34,
    height: 34,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 13,
  },
  input: { flex: 1, minHeight: 46, fontSize: 13, paddingVertical: 10 },
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 17,
  },
  summaryNumber: { fontSize: 24, lineHeight: 31, fontWeight: '600', letterSpacing: -0.7 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
  bigValue: {
    fontSize: 36,
    lineHeight: 46,
    letterSpacing: -1.2,
    fontWeight: '500',
    marginTop: 17,
    marginBottom: 4,
  },
  fieldLabel: { fontSize: 12, marginBottom: 6, marginTop: 7 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 4,
    minHeight: 48,
    paddingHorizontal: 12,
    fontSize: 17,
    marginBottom: 12,
  },
  noticeText: { fontSize: 12, marginVertical: 12 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  connectivity: { alignItems: 'center', paddingVertical: 28, gap: 17 },
  phoneCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
  },
  smallRule: { height: 1, width: 90, marginVertical: 6 },
  footer: { paddingTop: 20, paddingBottom: 8, borderTopWidth: 1, alignItems: 'center', gap: 4 },
  footerButton: { minHeight: 44, justifyContent: 'center' },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, minHeight: 60, paddingVertical: 6 },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 47 },
  scrim: {
    flex: 1,
    backgroundColor: '#11221a66',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    alignSelf: 'center',
  },
  drawer: { width: '88%', maxWidth: 350, height: '100%' },
  drawerWorkspace: { padding: 14, borderRadius: 4, gap: 4 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 49,
    paddingHorizontal: 12,
    marginBottom: 5,
    borderRadius: 4,
  },
  navLabel: { fontSize: 9, letterSpacing: 1.5, marginTop: 25, marginBottom: 12, marginLeft: 12 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: '#10291f66',
    justifyContent: 'flex-end',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    alignSelf: 'center',
  },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  toast: { position: 'absolute', bottom: 79, left: 22, right: 22, padding: 13, borderRadius: 6 },
  intro: { backgroundColor: '#fcfbf8', zIndex: 100 },
  introBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 24,
  },
  introWordmark: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8, color: '#10191b' },
  introCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  introPercentage: { fontSize: 17, color: '#111718', lineHeight: 24 },
  introLoading: { fontSize: 12, color: '#6b7670', textAlign: 'center' },
  introTagline: {
    fontSize: 18,
    textAlign: 'center',
    color: '#111718',
    marginTop: 24,
    lineHeight: 25,
  },
  skip: {
    minHeight: 52,
    marginBottom: 14,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
});
