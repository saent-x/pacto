import { createContext, ReactNode, useContext, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Card } from './Card';
import { SectionHead } from './SectionHead';

export type Bucket<T> = {
  label: string;
  dotColor?: string;
  rows: T[];
  count?: number;
};

const pointerEventsNoneProps = Platform.OS === 'web' ? {} : { pointerEvents: 'none' as const };

type Props<T> = {
  buckets: Bucket<T>[];
  renderRow: (row: T, index: number, bucket: Bucket<T>) => ReactNode;
  rowKey: (row: T, index: number) => string;
  spacing?: number;
  presentation?: 'grouped' | 'items';
  itemGap?: number;
  /** Rows render their own moving swipe surface instead of a static bucket border. */
  swipeableRows?: boolean;
};

export type BucketRowChrome = {
  presentation: 'grouped';
  index: number;
  total: number;
  ownsSurface?: boolean;
};

const BucketRowChromeContext = createContext<BucketRowChrome | null>(null);

export function useBucketRowChrome() {
  return useContext(BucketRowChromeContext);
}

/**
 * Reminders-screen list pattern. Each bucket renders a SectionHead followed
 * by a flat Card with hairline-separated rows. Used by Calendar, Tasks-Detail,
 * Reminders, and Wishlists.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/screens.jsx (RemindersScreen)
 * + /tmp/pacto-design/coupl-design-ii/project/modules.jsx (bucketed module screens)
 */
export function BucketedList<T>({
  buckets,
  renderRow,
  rowKey,
  spacing = 18,
  presentation = 'grouped',
  itemGap = 8,
  swipeableRows = false,
}: Props<T>) {
  const { C } = useTheme();
  const bucketViews = useMemo(
    () =>
      buckets.map((bucket, bi) => {
        const shouldGroupRows = presentation === 'grouped' || bucket.rows.length > 1;
        const rowsOwnSurface = swipeableRows && presentation === 'items';
        return (
          <View key={bucket.label + bi}>
            <SectionHead dotColor={bucket.dotColor} count={bucket.count ?? bucket.rows.length}>
              {bucket.label}
            </SectionHead>
            {!shouldGroupRows ? (
              <View style={[styles.itemList, { gap: itemGap }]}>
                {bucket.rows.map((row, ri) => (
                  <View key={rowKey(row, ri)} style={styles.bucketRow}>
                    {renderRow(row, ri, bucket)}
                  </View>
                ))}
              </View>
            ) : (
              <Card
                padded={false}
                style={[
                  styles.bucketCard,
                  {
                    backgroundColor: rowsOwnSurface ? 'transparent' : C.bgCard,
                  },
                ]}
              >
                {bucket.rows.map((row, ri) => (
                  <BucketRowChromeContext.Provider
                    key={rowKey(row, ri)}
                    value={{
                      presentation: 'grouped',
                      index: ri,
                      total: bucket.rows.length,
                      ownsSurface: rowsOwnSurface,
                    }}
                  >
                    <View
                      style={[
                        styles.bucketRow,
                        !rowsOwnSurface && ri < bucket.rows.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: C.lineColor }
                          : null,
                      ]}
                    >
                      {renderRow(row, ri, bucket)}
                    </View>
                  </BucketRowChromeContext.Provider>
                ))}
                {!rowsOwnSurface ? (
                  <View
                    {...pointerEventsNoneProps}
                    style={[
                      styles.bucketBorderOverlay,
                      Platform.OS === 'web' ? styles.pointerEventsNone : null,
                      { borderColor: C.lineColor },
                    ]}
                  />
                ) : null}
              </Card>
            )}
          </View>
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buckets, renderRow, rowKey, C.bgCard, C.lineColor, presentation, itemGap, swipeableRows],
  );
  return <View style={{ gap: spacing }}>{bucketViews}</View>;
}

const styles = StyleSheet.create({
  bucketCard: {
    position: 'relative',
    borderRadius: 18,
    borderWidth: 0,
    overflow: 'visible',
  },
  bucketBorderOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 18,
    borderWidth: 2,
    zIndex: 20,
    elevation: 20,
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  bucketRow: {
    overflow: 'visible',
  },
  itemList: {
    overflow: 'visible',
  },
});
