import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';
import type { ActivityHeatmapDay } from '@/src/lib/home/activity';

type Props = {
  days: ActivityHeatmapDay[];
  weeks?: number;
  todayColor?: string;
};

const RING_SIZE = 152;
const RING_RADII = [65, 50, 35]; // outer → inner
const RING_STROKE = [13, 12, 11];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Lean rhythm rings.
 *
 * Three concentric Apple-style arcs to the left, three stacked metric
 * rows to the right (WEEK / STREAK / PULSE). Arcs draw in on mount,
 * staggered outer→inner, so the chart feels alive on first reveal.
 */
export function RhythmHybrid({ days, weeks = 7, todayColor }: Props) {
  const { C } = useTheme();
  const tip = todayColor ?? C.peach;

  const stats = useMemo(() => deriveStats(days, weeks), [days, weeks]);
  const metrics = [
    {
      key: 'week',
      label: 'WEEK',
      value: stats.weekRatio,
      color: C.accent2,
      readout: `${stats.weekActive}/7`,
    },
    {
      key: 'streak',
      label: 'STREAK',
      value: stats.streakRatio,
      color: tip,
      readout: `${stats.streak}d`,
    },
    {
      key: 'pulse',
      label: 'PULSE',
      value: stats.pulseRatio,
      color: C.accent,
      readout: `${Math.round(stats.pulseRatio * 100)}%`,
    },
  ];

  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;

  return (
    <View style={styles.row}>
      <View style={styles.ringStack}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <G>
            {RING_RADII.map((r, i) => (
              <Circle
                key={`t-${i}`}
                cx={cx}
                cy={cy}
                r={r}
                stroke={alphaColor(metrics[i].color, 0.16)}
                strokeWidth={RING_STROKE[i]}
                fill="transparent"
              />
            ))}
          </G>
          <G transform={`rotate(-90 ${cx} ${cy})`}>
            {RING_RADII.map((r, i) => (
              <RingArc
                key={`a-${i}`}
                cx={cx}
                cy={cy}
                r={r}
                stroke={metrics[i].color}
                strokeWidth={RING_STROKE[i]}
                value={metrics[i].value}
                delay={i * 110}
              />
            ))}
          </G>
        </Svg>
      </View>

      <View style={styles.metrics}>
        {metrics.map((m) => (
          <View key={m.key} style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <View style={[styles.metricDot, { backgroundColor: m.color }]} />
              <Text
                style={[
                  Typography.eyebrowSm,
                  {
                    color: C.ink3,
                    fontSize: 10,
                    letterSpacing: 1.4,
                  },
                ]}
                numberOfLines={1}
              >
                {m.label}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: Typography.pixelFont,
                color: C.inkColor,
                fontSize: 18,
                lineHeight: 20,
                letterSpacing: -0.3,
                fontVariant: ['tabular-nums'],
              }}
              numberOfLines={1}
            >
              {m.readout}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RingArc({
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
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 720,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delay, progress, value]);

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

function deriveStats(days: ActivityHeatmapDay[], weeks: number) {
  const last7 = days.slice(Math.max(0, days.length - 7));
  const weekActive = last7.filter((d) => d.count > 0).length;
  const weekWeight = last7.reduce((s, d) => s + d.weight, 0);

  let maxWeekWeight = 1;
  for (let w = 0; w < weeks; w++) {
    let sum = 0;
    for (let d = 0; d < 7; d++) sum += days[w * 7 + d]?.weight ?? 0;
    if (sum > maxWeekWeight) maxWeekWeight = sum;
  }

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if ((days[i]?.count ?? 0) > 0) streak += 1;
    else break;
  }

  return {
    weekActive,
    weekRatio: weekActive / 7,
    streak,
    streakRatio: Math.min(1, streak / 14),
    pulseRatio: weekWeight / Math.max(1, maxWeekWeight),
  };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  ringStack: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    flex: 1,
    gap: 14,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
