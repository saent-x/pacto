import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';

type Category = {
  key: string;
  label: string;
  color: string;
};

type Props = {
  weeks?: number;
  seed?: number;
  color?: string;
  palette?: [string, string, string, string];
  categories?: Category[];
  showLegend?: boolean;
  showDayAxis?: boolean;
  showWeekAxis?: boolean;
  weekLabelMode?: 'markers' | 'months';
  cellGap?: number;
  cellRadius?: number;
  maxCellSize?: number;
};

const DEFAULT_GAP = 4;
const DOUBLE_TAP_MS = 280;

/**
 * GitHub-style activity heatmap that fills the container width. 12 weeks × 7 days
 * by default. Cells flex to spread evenly. Today's cell outlined.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/screens.jsx (ActivityHeatmap)
 */
export function ActivityHeatmap({
  weeks = 12,
  seed = 7,
  color,
  palette,
  categories,
  showLegend = true,
  showDayAxis = true,
  showWeekAxis = true,
  weekLabelMode = 'markers',
  cellGap = DEFAULT_GAP,
  cellRadius = 3,
  maxCellSize,
}: Props) {
  const { C } = useTheme();
  const heatColor = color ?? categories?.[0]?.color ?? C.accent;
  const colors = palette ?? [
    C.line2,
    mixColor(heatColor, 1),
    mixColor(heatColor, 2),
    mixColor(heatColor, 3),
  ];
  const [weekOffset, setWeekOffset] = useState(0);
  const lastTapAt = useRef(0);
  const swipedRef = useRef(false);
  const windowStart = useMemo(
    () => startOfWeekMonday(addDays(new Date(), (weekOffset - weeks + 1) * 7)),
    [weekOffset, weeks],
  );
  const currentWeekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const columnDates = useMemo(
    () => Array.from({ length: weeks }, (_, i) => addDays(windowStart, i * 7)),
    [weeks, windowStart],
  );
  const shiftWeeks = useCallback((delta: number) => {
    setWeekOffset((current) => current + delta);
    Haptics.selectionAsync().catch(() => undefined);
  }, []);
  const resetToNow = useCallback(() => {
    setWeekOffset((current) => {
      if (current !== 0) {
        Haptics.selectionAsync().catch(() => undefined);
      }
      return 0;
    });
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (swipedRef.current) {
      swipedRef.current = false;
      lastTapAt.current = 0;
      return;
    }
    const now = Date.now();
    if (now - lastTapAt.current <= DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      resetToNow();
      return;
    }
    lastTapAt.current = now;
  }, [resetToNow]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_evt, gesture) => {
          if (Math.abs(gesture.dx) < 28) return;
          swipedRef.current = true;
          shiftWeeks(gesture.dx < 0 ? 1 : -1);
        },
      }),
    [shiftWeeks],
  );

  const grid = useMemo(() => {
    const rng = makeRng(seed + (weekOffset + 1000) * 997);
    const cells: { weight: number }[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: { weight: number }[] = [];
      for (let w = 0; w < weeks; w++) {
        const r = rng();
        const weight = r < 0.45 ? 0 : r < 0.7 ? 1 : r < 0.88 ? 2 : 3;
        row.push({ weight });
      }
      cells.push(row);
    }
    return cells;
  }, [seed, weekOffset, weeks]);

  const todayCol = columnDates.findIndex((date) => sameDate(date, currentWeekStart));
  const todayRow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weekLabelFor = (index: number) => {
    if (weekLabelMode === 'months') {
      const date = columnDates[index];
      const previous = columnDates[index - 1];
      if (!date) return '';
      if (index !== 0 && previous && previous.getMonth() === date.getMonth()) return '';
      return date.toLocaleDateString(undefined, { month: 'short' });
    }
    const firstMarker = 0;
    const secondMarker = Math.floor(weeks / 3);
    const thirdMarker = Math.floor((weeks * 2) / 3);
    if (![firstMarker, secondMarker, thirdMarker, weeks - 1].includes(index)) return '';
    const date = columnDates[index];
    if (sameDate(date, currentWeekStart)) return 'now';
    if (index === weeks - 1 && weekOffset === 0) return 'now';
    if (date) return formatAxisDate(date);
    return '';
  };

  const [gridWidth, setGridWidth] = useState(0);
  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - gridWidth) > 0.5) setGridWidth(w);
  };
  // Each cell is one day. Keep cells square; intensity is activity volume.
  const cellW = gridWidth > 0
    ? Math.floor((gridWidth - cellGap * (weeks - 1)) / weeks)
    : 0;
  const fittedCellSize = cellW > 0 ? Math.max(8, cellW) : 0;
  const cellSize = maxCellSize && fittedCellSize > 0
    ? Math.min(fittedCellSize, maxCellSize)
    : fittedCellSize;

  return (
    <View style={{ gap: 12 }} onTouchEnd={handleTouchEnd} {...panResponder.panHandlers}>
      {showWeekAxis ? (
        <View style={styles.row}>
          {showDayAxis ? <View style={styles.axis} /> : null}
          <View style={[styles.weekAxis, { gap: cellGap }]}>
            {Array.from({ length: weeks }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: cellSize || 0,
                  minHeight: 12,
                  alignItems:
                    i === weeks - 1
                      ? 'flex-end'
                      : i === 0
                      ? 'flex-start'
                      : 'center',
                }}
              >
                {weekLabelFor(i) ? (
                  <Text
                    style={[
                      Typography.eyebrowSm,
                      {
                        color: C.ink3,
                        fontSize: 7.5,
                        letterSpacing: 0.2,
                        textTransform: 'none',
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {weekLabelFor(i)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.row}>
        {showDayAxis ? (
          <View style={[styles.axis, { gap: cellGap }]}>
            {dayLabels.map((label, i) => (
              <View key={i} style={[styles.axisCell, { height: cellSize || undefined }]}>
                <Text
                  style={[
                    Typography.eyebrowSm,
                    {
                      color: C.ink3,
                      fontSize: 9,
                      letterSpacing: 0,
                      textTransform: 'uppercase',
                      textAlign: 'center',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.grid, { gap: cellGap }]} onLayout={onGridLayout}>
          {grid.map((row, ri) => (
            <View
              key={ri}
              style={[
                styles.gridRow,
                { gap: cellGap, height: cellSize || undefined },
              ]}
            >
              {row.map((cell, ci) => {
                const isToday = todayCol >= 0 && ci === todayCol && ri === todayRow;
                const bg = colors[cell.weight] ?? colors[0];
                return (
                  <View
                    key={ci}
                    style={{
                      width: cellSize || 0,
                      height: cellSize || 0,
                      borderRadius: cellRadius,
                      backgroundColor: bg,
                      borderWidth: isToday ? 1.5 : 0,
                      borderColor: isToday ? C.inkColor : 'transparent',
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          <View style={styles.scaleGroup}>
            <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9 }]}>less</Text>
            {[1, 2, 3].map((w) => (
              <View
                key={w}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  backgroundColor: colors[w] ?? colors[0],
                }}
              />
            ))}
            <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9 }]}>more</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function mixColor(hex: string, weight: number): string {
  const a = weight === 1 ? 0.32 : weight === 2 ? 0.6 : 0.92;
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function sameDate(a: Date | undefined, b: Date | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatAxisDate(date: Date): string {
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  return `${month} ${date.getDate()}`;
}

function makeRng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  axis: {
    width: 14,
    paddingTop: 0,
  },
  axisCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
  },
  grid: {
    flex: 1,
  },
  weekAxis: {
    flex: 1,
    flexDirection: 'row',
  },
  gridRow: {
    flexDirection: 'row',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  scaleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
