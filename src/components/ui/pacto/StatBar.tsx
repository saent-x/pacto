import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle, type StyleProp } from 'react-native';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type Props = {
  eyebrow: string;
  meta?: string;
  primary?: ReactNode;
  microVis?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Slim status row that replaces the giant colored hero cards. Reads as
 * eyebrow + meta on top, an inline metric line below, and an optional
 * micro-visualization row. Lets the actual list/grid content lead the screen.
 */
export function StatBar({ eyebrow, meta, primary, microVis, style }: Props) {
  const { C } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.headRow}>
        <Text style={[Typography.eyebrow, { color: C.ink3 }]} numberOfLines={1}>
          {eyebrow}
        </Text>
        {meta ? (
          <Text
            style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}
            numberOfLines={1}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      {primary ? <View style={styles.primaryRow}>{primary}</View> : null}
      {microVis ? <View style={styles.visRow}>{microVis}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 14,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  visRow: {
    marginTop: 10,
  },
});
