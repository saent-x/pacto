import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  HeaderBrand,
  PulsingDot,
  SegmentedTabs,
  StatBar,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTimetables, type TimetableRow } from '@/src/hooks/useTimetables';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { normalizeTemplateKey, tmplByKey } from '@/src/lib/timetables-data';

type FilterKey = 'all' | 'solo' | 'shared';

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

function templateMeta(template: string, title?: string) {
  return tmplByKey(normalizeTemplateKey(template, title));
}

export default function TimetablesIndex() {
  return (
    <FeatureRouteGuard featureId="timetable">
      <TimetablesIndexInner />
    </FeatureRouteGuard>
  );
}

function TimetablesIndexInner() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { mode } = useSession();
  const { timetables, remove } = useTimetables();

  const [filter, setFilter] = useState<FilterKey>('all');

  const eyebrowLabel =
    mode === 'solo' ? 'ME' : mode === 'crew' ? 'CREW' : 'US';

  const stats = useMemo(() => {
    const total = timetables.length;
    const solo = timetables.filter((t) => t.share === 'solo').length;
    const shared = total - solo;
    const totalItems = timetables.reduce((s, t) => s + t.itemsCount, 0);
    // Aggregate items-per-day across all timetables (Monday first).
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const t of timetables) {
      for (let i = 0; i < 7; i++) dayCounts[i] += t.dayCounts[i] ?? 0;
    }
    const peak = Math.max(1, ...dayCounts);
    return { total, solo, shared, totalItems, dayCounts, peak };
  }, [timetables]);

  const featured = useMemo(() => timetables[0] ?? null, [timetables]);

  const visible = useMemo(() => {
    return timetables.filter((t) => {
      if (filter === 'solo') return t.share === 'solo';
      if (filter === 'shared') return t.share !== 'solo';
      return true;
    });
  }, [timetables, filter]);

  const buckets = useMemo<Bucket<TimetableRow>[]>(() => {
    if (mode === 'solo') {
      return visible.length
        ? [{ label: 'Timetable', dotColor: C.accent, rows: visible }]
        : [];
    }
    const groups: Record<string, TimetableRow[]> = {
      Shared: [],
      Solo: [],
    };
    for (const t of visible) {
      if (t.share === 'solo') groups.Solo.push(t);
      else groups.Shared.push(t);
    }
    const order = ['Shared', 'Solo'];
    const dotMap: Record<string, string> = {
      Shared: C.accent,
      Solo: C.ink2,
    };
    return order
      .filter((k) => groups[k]?.length)
      .map((k) => ({
        label: k,
        dotColor: dotMap[k],
        rows: groups[k],
      }));
  }, [visible, mode, C.accent, C.ink2]);

  const filterOptions: { key: FilterKey; label: string }[] =
    mode === 'solo'
      ? [{ key: 'all', label: 'All' }]
      : [
          { key: 'all', label: 'All' },
          { key: 'shared', label: 'Shared' },
          { key: 'solo', label: 'Solo' },
        ];

  const heroEyebrow =
    stats.total === 0
      ? 'NO TIMETABLES YET'
      : `${stats.total} ${stats.total === 1 ? 'TIMETABLE' : 'TIMETABLES'} · ${stats.totalItems} ${stats.totalItems === 1 ? 'ITEM' : 'ITEMS'}`;
  const heroTitle = featured?.title ?? 'Build a timetable';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          headerTintColor: C.inkColor,
          title: '',
          headerTitleAlign: 'center',
          headerTitle: () => (
            <HeaderBrand eyebrow={eyebrowLabel} title="timetable" />
          ),
          headerLeft: () => (
            <PressScale
              onPress={() => router.back()}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon name="chevronLeft" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              onPress={() => router.push('/sheets/new-timetable' as any)}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon name="plus" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — slim status row + 7-day timetable strip */}
        <View style={styles.heroWrap}>
          <StatBar
            accent={C.accent2}
            eyebrow={heroEyebrow}
            meta={
              featured
                ? `${templateMeta(featured.template, featured.title).shortLabel.toUpperCase()} · ${featured.share === 'solo' ? 'SOLO' : 'SHARED'}${featured.updatedAt ? ` · ${format(new Date(featured.updatedAt), 'MMM d').toUpperCase()}` : ''}`
                : undefined
            }
            primary={
              <>
                <Text
                  style={[Typography.pixelHeroSm, { color: C.inkColor }]}
                  numberOfLines={1}
                >
                  {heroTitle}
                </Text>
                {featured ? <PulsingDot color={C.accent2} /> : null}
              </>
            }
            microVis={
              <View style={styles.weekGrid}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
                  const count = stats.dayCounts[i] ?? 0;
                  const slots = Math.max(0, Math.min(3, count));
                  const intensities: number[] = [];
                  for (let s = 0; s < 3; s++) {
                    if (s < slots) {
                      const norm = count / stats.peak;
                      intensities.push(0.35 + norm * 0.55);
                    } else {
                      intensities.push(0);
                    }
                  }
                  const colors = [C.accent2, C.accent3, C.accent];
                  return (
                    <View key={i} style={styles.weekCell}>
                      <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9 }]}>
                        {d}
                      </Text>
                      <View style={[styles.weekBlocks, { backgroundColor: C.bgSoft }]}>
                        {[0, 1, 2].map((s) => (
                          <View
                            key={s}
                            style={[
                              styles.weekBlock,
                              {
                                backgroundColor:
                                  intensities[s] > 0
                                    ? withAlpha(colors[s], intensities[s])
                                    : 'transparent',
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text
                        style={[
                          Typography.mono,
                          { color: count > 0 ? C.ink2 : C.ink3, fontSize: 9, marginTop: 2 },
                        ]}
                      >
                        {count > 0 ? count : '·'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            }
          />
        </View>

        {/* Filter pills */}
        {filterOptions.length > 1 ? (
          <View style={styles.filterRow}>
            <SegmentedTabs<FilterKey>
              value={filter}
              onChange={setFilter}
              options={filterOptions.map((f) => ({ key: f.key, label: f.label }))}
            />
          </View>
        ) : (
          <View style={{ height: 14 }} />
        )}

        {/* Bucketed list */}
        <View style={styles.listWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="grid"
              title="No timetables yet"
              body="Build a weekly timetable for workouts, meals, study blocks, or any repeating routine."
              actionLabel="New timetable"
              accent={C.accent2}
              onAction={() => router.push('/sheets/new-timetable' as any)}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              presentation="items"
              swipeableRows
              rowKey={(t) => t.id}
              renderRow={(t) => (
                <TimetableListRow
                  timetable={t}
                  onOpen={() => router.push(`/(tabs)/us/timetables/${t.id}` as any)}
                  onEdit={() => router.push(`/sheets/new-timetable?id=${t.id}` as any)}
                  onDelete={() => remove(t.id)}
                  colors={C}
                />
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  weekBlocks: {
    width: '100%',
    aspectRatio: 0.45,
    borderRadius: 4,
    padding: 3,
    gap: 2,
    justifyContent: 'flex-start',
  },
  weekBlock: {
    width: '100%',
    height: 6,
    borderRadius: 1.5,
  },
  filterRow: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 6,
  },
  listWrap: {
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
});

type TimetableListRowProps = {
  timetable: TimetableRow;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof useTheme>['C'];
};

function TimetableListRow({
  timetable: t,
  onOpen,
  onEdit,
  onDelete,
  colors: C,
}: TimetableListRowProps) {
  const meta = templateMeta(t.template, t.title);

  return (
    <SwipeableRow
      deleteTitle="Delete timetable?"
      deleteMessage={`"${t.title}" and all its items will be removed.`}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <PressScale
        onPress={onOpen}
        accessibilityLabel={`${t.title}, ${t.itemsCount} ${
          t.itemsCount === 1 ? 'item' : 'items'
        }, ${t.share === 'solo' ? 'solo' : 'shared'}`}
        accessibilityHint="Open this timetable"
        style={styles.row}
      >
        <View
          testID={`timetable-row-icon-tile-${t.id}`}
          style={[
            styles.iconTile,
            {
              backgroundColor: meta.color,
              borderColor: withAlpha(meta.ink, 0.2),
            },
          ]}
        >
          <Icon
            testID={`timetable-row-icon-${t.id}`}
            name={meta.icon}
            size={17}
            color={meta.ink}
            strokeWidth={2.2}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headRow}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: C.inkColor, flex: 1 },
              ]}
              numberOfLines={1}
            >
              {t.title}
            </Text>
            <Text
              style={[
                Typography.eyebrowSm,
                { color: C.ink3, fontSize: 9.5 },
              ]}
            >
              {t.itemsCount} {t.itemsCount === 1 ? 'ITEM' : 'ITEMS'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text
              style={[
                Typography.eyebrowSm,
                { color: meta.ink, fontSize: 9.5 },
              ]}
            >
              {meta.shortLabel.toUpperCase()}
            </Text>
            <Text
              style={[
                Typography.eyebrowSm,
                {
                  color: t.share === 'solo' ? C.ink3 : C.accent,
                  fontSize: 9.5,
                },
              ]}
            >
              · {t.share === 'solo' ? 'SOLO' : 'SHARED'}
            </Text>
            {t.updatedAt ? (
              <Text
                style={[
                  Typography.mono,
                  { color: C.ink3, fontSize: 11 },
                ]}
              >
                · {format(new Date(t.updatedAt), 'MMM d')}
              </Text>
            ) : null}
          </View>
        </View>
        <Icon
          name="chevronRight"
          size={14}
          color={C.ink3}
          strokeWidth={2.2}
        />
      </PressScale>
    </SwipeableRow>
  );
}
