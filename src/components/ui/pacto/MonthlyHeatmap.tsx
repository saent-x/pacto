import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';
import type { ActivityHeatmapDay } from '@/src/lib/home/activity';

type Props = {
  days: ActivityHeatmapDay[];
  weeks?: number;
  palette?: [string, string, string, string];
  todayColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  onDayPress?: (day: ActivityHeatmapDay) => void;
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const LEVEL_LABELS = ['0', '1', '2', '3+'];
const CELL_INDICES = [0, 1, 2, 3, 4, 5, 6];

/**
 * Compact activity map. 4 rows × 7 cols of large cells. Today's cell gets
 * a peach outline; cells call back via onDayPress when tapped.
 */
export function MonthlyHeatmap({
  days,
  weeks = 4,
  palette: paletteOverride,
  todayColor,
  surfaceColor,
  borderColor,
  style,
  onDayPress,
}: Props) {
  const { C } = useTheme();
  const palette: [string, string, string, string] = paletteOverride ?? [
    alphaColor(C.accent2, 0.10),
    alphaColor(C.accent2, 0.32),
    alphaColor(C.accent2, 0.62),
    C.accent,
  ];

  const todayKey = useMemo(() => formatLocalDateKey(new Date()), []);

  const grid = useMemo(() => {
    const tail = days.slice(Math.max(0, days.length - weeks * 7));
    const rows: ActivityHeatmapDay[][] = [];
    for (let w = 0; w < weeks; w++) {
      rows.push(tail.slice(w * 7, w * 7 + 7));
    }
    return rows;
  }, [days, weeks]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surfaceColor ?? C.bgCard,
          borderColor: borderColor ?? C.lineColor,
        },
        style,
      ]}
    >
      <View style={styles.legend}>
        {LEVEL_LABELS.map((label, i) => (
          <View key={i} style={styles.legendCell}>
            <Text
              style={[
                Typography.eyebrowSm,
                {
                  color: C.ink3,
                  fontSize: 9,
                  letterSpacing: 0.6,
                  fontVariant: ['tabular-nums'],
                },
              ]}
            >
              {label}
            </Text>
            <View style={[styles.legendDot, { backgroundColor: palette[i] }]} />
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <Text
          style={[
            Typography.eyebrowSm,
            { color: C.ink3, fontSize: 9, letterSpacing: 1.2 },
          ]}
        >
          ITEMS / DAY
        </Text>
      </View>

      <View style={styles.dayHeader}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={styles.dayCol}>
            <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9, letterSpacing: 1.4 }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {grid.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {CELL_INDICES.map((ci) => {
            const cell = row[ci];
            const fill = cell ? palette[cell.weight] ?? palette[0] : palette[0];
            const isToday = !!cell && cell.dateKey === todayKey;
            const cellNode = (
              <View
                style={[
                  styles.cell,
                  {
                    backgroundColor: fill,
                    borderWidth: isToday ? 1.75 : 0,
                    borderColor: isToday ? (todayColor ?? C.peach) : 'transparent',
                  },
                ]}
              />
            );
            const a11y = cell
              ? `${cell.count} ${cell.count === 1 ? 'item' : 'items'} on ${cell.dateKey}${
                  isToday ? ', today' : ''
                }`
              : 'No data';
            if (onDayPress && cell) {
              return (
                <PressScale
                  key={ci}
                  onPress={() => onDayPress(cell)}
                  haptic="impact"
                  pressedScale={0.92}
                  accessibilityLabel={a11y}
                  style={styles.cellWrap}
                >
                  {cellNode}
                </PressScale>
              );
            }
            return (
              <View key={ci} style={styles.cellWrap} accessibilityLabel={a11y}>
                {cellNode}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 10,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  cellWrap: {
    flex: 1,
    aspectRatio: 1,
  },
  cell: {
    flex: 1,
    borderRadius: 10,
  },
});
