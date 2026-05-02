import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { PulsingDot } from './PulsingDot';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

export type RingValues = {
  /** 0..1 per metric, length must equal `metrics.length`. */
  values: number[];
};

type Metric = {
  key: string;
  /** Display label, rendered in the legend (Geist Mono caps). */
  label: string;
  /** Hard arc colour. */
  color: string;
  /** Faded track behind the arc. Defaults to single hairline tone. */
  trackColor?: string;
};

type Props = {
  /** Header strip eyebrow, e.g. `APR 21 — 27 · CONNECT · SHARE · PRESENT`. */
  eyebrow: string;
  /** Hero label rendered in italic above the eyebrow, e.g. "full". */
  label: string;
  metrics: [Metric, Metric, Metric];
  weekTotals: RingValues;
  /** 7 entries Monday → Sunday. */
  days: { label: string; values: number[] }[];
  /** Index 0..6 to highlight the day letter. -1 = none. */
  highlightDayIdx?: number;
};

const HERO_RADII = [50, 38, 26]; // outer → inner
const HERO_STROKE = [6, 5.5, 5];
const DAY_RADII = [18, 13, 8.5];
const DAY_STROKE = [3, 2.6, 2.2];
const HERO_SIZE = 124;
const DAY_SIZE = 46;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnimatedArc({
  cx,
  cy,
  r,
  stroke,
  strokeWidth,
  value,
  delay,
}: {
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  strokeWidth: number;
  value: number;
  delay: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delay, progress]);

  const animatedProps = useAnimatedProps(() => {
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(1, value));
    return {
      strokeDasharray: `${c * v * progress.value} ${c}`,
    } as { strokeDasharray: string };
  });

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      fill="transparent"
      animatedProps={animatedProps}
    />
  );
}

function Ring({
  size,
  radii,
  stroke,
  values,
  metrics,
  trackColor,
  staggerDelay = 0,
}: {
  size: number;
  radii: number[];
  stroke: number[];
  values: number[];
  metrics: Metric[];
  trackColor: string;
  staggerDelay?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  return (
    <Svg width={size} height={size}>
      {/* Tracks — single hairline tone, matches the rest of the system */}
      <G>
        {radii.map((r, i) => {
          const m = metrics[i];
          const tc = m?.trackColor ?? trackColor;
          return (
            <Circle
              key={`t-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              stroke={tc}
              strokeWidth={stroke[i]}
              fill="transparent"
            />
          );
        })}
      </G>
      {/* Arcs — start at 12 o'clock, sweep clockwise, mount staggered outer→inner */}
      <G transform={`rotate(-90 ${cx} ${cy})`}>
        {radii.map((r, i) => (
          <AnimatedArc
            key={`a-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            stroke={metrics[i]?.color ?? '#000'}
            strokeWidth={stroke[i]}
            value={values[i] ?? 0}
            delay={staggerDelay + i * 110}
          />
        ))}
      </G>
    </Svg>
  );
}

export function ActivityRings({
  eyebrow,
  label,
  metrics,
  weekTotals,
  days,
  highlightDayIdx = -1,
}: Props) {
  const { C } = useTheme();
  return (
    <View>
      {/* Hero — eyebrow + pixel headline (left) · ring (right) */}
      <View style={styles.heroRow}>
        <View style={{ flex: 1, paddingRight: 14 }}>
          <Text
            style={[
              Typography.eyebrowSm,
              {
                color: C.ink3,
                fontSize: 10,
                letterSpacing: 1.6,
                lineHeight: 14,
                fontVariant: ['tabular-nums'],
              },
            ]}
            numberOfLines={1}
          >
            {eyebrow}
          </Text>
          <Text
            style={{
              fontFamily: Typography.pixelFont,
              fontSize: 32,
              color: C.inkColor,
              marginTop: 6,
              textTransform: 'uppercase',
              letterSpacing: -0.4,
              lineHeight: 36,
            }}
            numberOfLines={1}
          >
            {label}
            <PulsingDot color={metrics[0].color} />
          </Text>
        </View>
        <Ring
          size={HERO_SIZE}
          radii={HERO_RADII}
          stroke={HERO_STROKE}
          values={weekTotals.values}
          metrics={metrics}
          trackColor={C.lineColor}
        />
      </View>

      {/* Metric legend — single row, evenly distributed */}
      <View style={styles.metricRow}>
        {metrics.map((m, i) => {
          const pct = Math.round(
            Math.max(0, Math.min(1, weekTotals.values[i] ?? 0)) * 100,
          );
          return (
            <View key={m.key} style={styles.metricCell}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: m.color,
                  marginRight: 7,
                }}
              />
              <Text
                style={[
                  Typography.mono,
                  {
                    color: C.ink2,
                    fontSize: 10,
                    letterSpacing: 1,
                  },
                ]}
                numberOfLines={1}
              >
                {m.label.toUpperCase()}
              </Text>
              <Text
                style={[
                  Typography.mono,
                  {
                    color: C.ink3,
                    fontSize: 10,
                    letterSpacing: 0.4,
                    marginLeft: 6,
                    fontVariant: ['tabular-nums'],
                  },
                ]}
              >
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Day strip — divider above to anchor the row to the hero block */}
      <View style={[styles.divider, { backgroundColor: C.lineColor }]} />
      <View style={styles.dayStrip}>
        {days.map((d, i) => {
          const highlighted = i === highlightDayIdx;
          return (
            <View key={i} style={styles.dayCell}>
              <Ring
                size={DAY_SIZE}
                radii={DAY_RADII}
                stroke={DAY_STROKE}
                values={d.values}
                metrics={metrics}
                trackColor={C.lineColor}
                staggerDelay={400 + i * 70}
              />
              <Text
                style={[
                  Typography.eyebrowSm,
                  {
                    color: highlighted ? metrics[0].color : C.ink3,
                    fontSize: 10.5,
                    letterSpacing: 1,
                    marginTop: 8,
                    fontWeight: '600',
                  },
                ]}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metricCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  dayCell: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    height: 1,
    marginTop: 18,
  },
});
