import { useMemo } from 'react';
import { View } from 'react-native';
import { useColors } from '../theme';
import { QSection } from './shell';
import { Kick } from './Text';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Single-hue intensity for a level: 0 = empty (hairline), 1..4 = accent ramp,
// <0 = blank (future day in the current week).
function cellStyle(C: ReturnType<typeof useColors>, lvl: number) {
  return {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 3,
    backgroundColor: lvl <= 0 ? C.line : C.accent,
    opacity: lvl < 0 ? 0 : lvl === 0 ? 1 : 0.32 + (lvl - 1) * 0.227,
  } as const;
}

/**
 * Activity heatmap — a 7-row (Mon→Sun) × N-column (weeks) grid of single-hue
 * intensity cells, matching the Quiet design's "Activity" block.
 *
 * @param levels      7 rows × W columns; each value 0 (none), 1–4 (intensity), or <0 (blank/future).
 * @param weekStartMs Monday (00:00 local) of the first/leftmost column.
 */
export function ActivityHeatmap({ levels, weekStartMs }: { levels: number[][]; weekStartMs: number }) {
  const C = useColors();
  const weeks = levels[0]?.length ?? 0;

  const kept = useMemo(
    () => levels.reduce((s, row) => s + row.filter((v) => v > 0).length, 0),
    [levels],
  );

  // Distinct months spanning the window, in order (spaced across the grid width).
  // Calendar math, not w*7*DAY_MS — fixed 24h steps drift across DST transitions.
  const months = useMemo(() => {
    const out: string[] = [];
    let prev = -1;
    for (let w = 0; w < weeks; w++) {
      const md = new Date(weekStartMs);
      md.setDate(md.getDate() + w * 7);
      const m = md.getMonth();
      if (m !== prev) {
        out.push(MONTHS[m]);
        prev = m;
      }
    }
    return out;
  }, [weeks, weekStartMs]);

  return (
    <View style={{ marginTop: 40 }}>
      <QSection label="Activity" action={<Kick color={C.ink3}>{kept} days kept</Kick>} />

      {/* month labels — spaced across the grid, sized to content (no clipping) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 1 }}>
        {months.map((m, i) => (
          <Kick key={i} color={C.ink4} style={{ fontSize: 10, letterSpacing: 0.4 }}>
            {m}
          </Kick>
        ))}
      </View>

      {/* grid: one row per weekday, one cell per week */}
      {levels.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 4, marginBottom: r < 6 ? 4 : 0 }}>
          {row.map((lvl, c) => (
            <View key={c} style={cellStyle(C, lvl)} />
          ))}
        </View>
      ))}

      {/* legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
        <Kick color={C.ink4}>Less</Kick>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2, 3, 4].map((l) => (
            <View
              key={l}
              style={{
                width: 11,
                height: 11,
                borderRadius: 3,
                backgroundColor: l === 0 ? C.line : C.accent,
                opacity: l === 0 ? 1 : 0.32 + (l - 1) * 0.227,
              }}
            />
          ))}
        </View>
        <Kick color={C.ink4}>More</Kick>
      </View>
    </View>
  );
}

/**
 * Build the 7×weeks level matrix + the Monday of the first column from a set of
 * activity timestamps (check-ins, kept tasks/reminders, events). Rows are Mon→Sun.
 */
export function buildActivity(timestamps: number[], weeks = 17, now: number = Date.now()): {
  levels: number[][];
  weekStartMs: number;
} {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  const dow = (todayStart.getDay() + 6) % 7; // 0 = Monday
  // Calendar math, not fixed 24h steps — the window spans DST transitions, and
  // ms arithmetic would land day keys off local midnight for older weeks.
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - dow - (weeks - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartMs = weekStart.getTime();

  // count activity per day
  const counts = new Map<number, number>();
  for (const ts of timestamps) {
    if (!ts) continue;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    const k = d.getTime();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const levelFor = (count: number) => (count <= 0 ? 0 : count >= 4 ? 4 : count);

  const levels: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const row: number[] = [];
    for (let w = 0; w < weeks; w++) {
      const c = new Date(weekStart);
      c.setDate(weekStart.getDate() + w * 7 + d);
      c.setHours(0, 0, 0, 0);
      const dayMs = c.getTime();
      if (dayMs > todayMs) row.push(-1); // future day in the current week
      else row.push(levelFor(counts.get(dayMs) ?? 0));
    }
    levels.push(row);
  }
  return { levels, weekStartMs };
}
