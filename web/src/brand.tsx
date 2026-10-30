import React from 'react';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

export const rings = [
  'M72 152H64C33.072 152 8 126.928 8 96V64C8 33.072 33.072 8 64 8H96C126.928 8 152 33.072 152 64V96C152 126.928 126.928 152 96 152H88',
  'M72 130H64C45.222 130 30 114.778 30 96V64C30 45.222 45.222 30 64 30H96C114.778 30 130 45.222 130 64V96C130 114.778 114.778 130 96 130H88',
  'M72 108C60.954 108 52 99.046 52 88V72C52 60.954 60.954 52 72 52H88C99.046 52 108 60.954 108 72V88C108 99.046 99.046 108 88 108',
];
export function Mark({
  size = 32,
  color = '#142e43',
  thin = false,
  progress,
}: {
  size?: number;
  color?: string;
  thin?: boolean;
  progress?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" accessibilityLabel="MeterOak logo">
      {rings.map((d, index) => {
        const length = [464, 326, 174][index];
        const revealed =
          progress === undefined ? 1 : Math.min(1, Math.max(0, progress * 3 - (2 - index)));
        return (
          <React.Fragment key={index}>
            {progress !== undefined && (
              <Path d={d} stroke="#d8ddda" strokeWidth={2.5} fill="none" />
            )}
            <Path
              d={d}
              stroke={color}
              strokeWidth={thin ? 2.5 : 11}
              fill="none"
              strokeLinejoin="round"
              strokeDasharray={progress === undefined ? undefined : `${length} ${length}`}
              strokeDashoffset={progress === undefined ? undefined : length * (1 - revealed)}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
export type IconName =
  | 'overview'
  | 'models'
  | 'sessions'
  | 'budgets'
  | 'insights'
  | 'connections'
  | 'connectivity'
  | 'menu'
  | 'close'
  | 'arrow'
  | 'refresh'
  | 'download'
  | 'search'
  | 'check'
  | 'shield';
const paths: Record<IconName, string> = {
  overview: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  models: 'm12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  sessions: 'M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1',
  budgets: 'M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7M21 12h-5v4h5',
  insights: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  connections: 'M8 3v5M16 3v5M5 8h14v3a7 7 0 0 1-14 0zM12 18v4',
  connectivity: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM10 18h4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  refresh: 'M3 4v6h6M3.5 9a9 9 0 1 1 .5 8',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  check: 'm4 12 5 5L20 6',
  shield: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6',
};
export function Icon({
  name,
  color = '#253d33',
  size = 20,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function ProgressArc({
  progress,
  color = '#111718',
  track = '#d8ddda',
  width = 250,
}: {
  progress: number;
  color?: string;
  track?: string;
  width?: number;
}) {
  const x = 15 + 270 * progress;
  const y = 23 + 130 * progress * (1 - progress);
  return (
    <Svg width={width} height={96} viewBox="0 0 300 96">
      <Path d="M15 23Q150 88 285 23" fill="none" stroke={track} strokeWidth={2} />
      <Path
        d={`M15 23Q${15 + 135 * progress} ${23 + 65 * progress} ${x} ${y}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <Circle cx={x} cy={y} r={5} fill={color} />
      <SvgText
        x={x}
        y={Math.max(12, y - 16)}
        textAnchor={progress < 0.1 ? 'start' : progress > 0.9 ? 'end' : 'middle'}
        fill={color}
        fontSize={16}
      >
        {Math.round(progress * 100)}%
      </SvgText>
    </Svg>
  );
}
