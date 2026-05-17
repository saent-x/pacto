import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { PulsingStatusDot } from './PulsingDot';

type Props = {
  children: string;
  dotColor?: string;
  count?: number;
  action?: ReactNode;
};

/**
 * Geist Mono uppercase section head. Optional leading dot + trailing count.
 * Used above bucketed lists and grouped cards.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (SectionHead)
 */
export function SectionHead({ children, dotColor, count, action }: Props) {
  const { C } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {dotColor ? <PulsingStatusDot color={dotColor} size={6} /> : null}
        <Text style={[Typography.eyebrow, { color: C.ink3 }]}>{children}</Text>
        {typeof count === 'number' ? (
          <Text style={[Typography.eyebrow, { color: C.ink3, opacity: 0.6 }]}>· {count}</Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
});
