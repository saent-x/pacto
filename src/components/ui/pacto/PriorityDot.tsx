import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/lib/theme';

type Level = 'none' | 'low' | 'med' | 'high';

type Props = {
  level?: Level;
};

/**
 * 3-bar priority indicator (none / low / med / high).
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (PriorityDot)
 */
export function PriorityDot({ level }: Props) {
  const { C } = useTheme();
  if (!level || level === 'none') return null;

  const map: Record<Exclude<Level, 'none'>, { color: string; n: number }> = {
    low: { color: C.ink3, n: 1 },
    med: { color: '#D4A054', n: 2 },
    high: { color: C.accent, n: 3 },
  };
  const it = map[level];

  return (
    <View style={styles.container}>
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
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
  bar: {
    width: 4,
    height: 9,
    borderRadius: 1,
  },
});
