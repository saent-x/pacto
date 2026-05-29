import { StyleSheet, Text, View } from 'react-native';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';
import { normalizePriority } from '@/src/lib/priority';
import { useTheme } from '@/src/lib/theme';

export type PriorityLevel = 'none' | 'low' | 'med' | 'high';

type Props = {
  level?: PriorityLevel;
  /** When true, only the 3-bar glyph renders (no label, no pill chrome). */
  compact?: boolean;
  /** Optional accent override for the high level (defaults to theme accent). */
  accent?: string;
};

/**
 * Shared priority indicator. Canonical source: reminders row (compact glyph).
 * Non-compact form mirrors the labeled badge from the plans screen.
 *
 * Levels: none renders nothing; low/med/high light 1/2/3 bars and pick a
 * matching tone (ink3 → butter/accent3 → accent).
 */
export function PriorityPill({ level, compact, accent }: Props) {
  const { C } = useTheme();
  if (!level || level === 'none') return null;

  const map: Record<Exclude<PriorityLevel, 'none'>, { color: string; n: number; label: string }> = {
    low: { color: C.ink3, n: 1, label: 'LOW' },
    med: { color: C.accent3, n: 2, label: 'MED' },
    high: { color: accent ?? C.accent, n: 3, label: 'HIGH' },
  };
  const it = map[level];

  const glyph = (
    <View style={styles.glyph}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { backgroundColor: i < it.n ? it.color : C.lineColor },
          ]}
        />
      ))}
    </View>
  );

  if (compact) return glyph;

  return (
    <View
      accessibilityLabel={`${it.label.toLowerCase()} priority`}
      style={[
        styles.badge,
        {
          backgroundColor: alphaColor(it.color, 0.16),
          borderColor: alphaColor(it.color, 0.42),
        },
      ]}
    >
      {glyph}
      <Text
        style={[
          Typography.eyebrowSm,
          { color: C.inkColor, fontSize: 9.5 },
        ]}
      >
        {it.label}
      </Text>
    </View>
  );
}

/** Map a numeric priority (0..3+) to a PriorityLevel. */
export function priorityLevelFromNumber(p: number | null | undefined): PriorityLevel {
  const n = normalizePriority(p);
  if (n >= 3) return 'high';
  if (n === 2) return 'med';
  if (n === 1) return 'low';
  return 'none';
}

const styles = StyleSheet.create({
  glyph: {
    flexDirection: 'row',
    gap: 2,
  },
  bar: {
    width: 4,
    height: 9,
    borderRadius: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
});
