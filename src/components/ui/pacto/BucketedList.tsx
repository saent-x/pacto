import { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Card } from './Card';
import { SectionHead } from './SectionHead';

export type Bucket<T> = {
  label: string;
  dotColor?: string;
  rows: T[];
};

type Props<T> = {
  buckets: Bucket<T>[];
  renderRow: (row: T, index: number, bucket: Bucket<T>) => ReactNode;
  rowKey: (row: T, index: number) => string;
  spacing?: number;
};

/**
 * Reminders-screen list pattern. Each bucket renders a SectionHead followed
 * by a flat Card with hairline-separated rows. Used by Calendar, Tasks-Detail,
 * Reminders, Wishlists, Expenses.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/screens.jsx (RemindersScreen)
 * + /tmp/pacto-design/coupl-design-ii/project/modules.jsx (bucketed module screens)
 */
export function BucketedList<T>({ buckets, renderRow, rowKey, spacing = 18 }: Props<T>) {
  const { C } = useTheme();
  return (
    <View style={{ gap: spacing }}>
      {buckets.map((bucket, bi) => (
        <View key={bucket.label + bi}>
          <SectionHead dotColor={bucket.dotColor} count={bucket.rows.length}>
            {bucket.label}
          </SectionHead>
          <Card padded={false}>
            {bucket.rows.map((row, ri) => (
              <View
                key={rowKey(row, ri)}
                style={
                  ri < bucket.rows.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: C.lineColor }
                    : null
                }
              >
                {renderRow(row, ri, bucket)}
              </View>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}
