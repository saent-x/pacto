import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  Card,
  HeaderBrand,
  PulsingDot,
  SegmentedTabs,
  StatBar,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useMilestones } from '@/src/hooks/useMilestones';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type MilestoneRow = {
  id: string;
  title: string;
  date: string;
  description: string | null;
  icon: string;
  repeatYearly: boolean;
  isUpcoming: boolean;
  daysUntil: number | null;
  yearsAgo: number | null;
};

type FilterKey = 'all' | 'upcoming' | 'past' | 'recurring';

// Whitelist of icon names that the new-milestone sheet offers + a few extras.
// Anything else (legacy emoji values, free-text) falls through to the default flag.
const VALID_ICON_NAMES: ReadonlySet<IconName> = new Set<IconName>([
  'heart',
  'star',
  'home',
  'mapPin',
  'gift',
  'coffee',
  'briefcase',
  'camera',
  'music',
  'flag',
  'sun',
  'moon',
  'sparkle',
  'compass',
  'feather',
  'book',
]);

function resolveMilestoneIcon(value: string | null | undefined): IconName {
  if (value && VALID_ICON_NAMES.has(value as IconName)) return value as IconName;
  return 'flag';
}

export default function MilestonesScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { mode } = useSession();
  const { milestones, remove } = useMilestones();

  const [filter, setFilter] = useState<FilterKey>('all');

  const eyebrowLabel =
    mode === 'solo' ? 'ME' : mode === 'crew' ? 'CREW' : 'US';

  const rows = useMemo<MilestoneRow[]>(() => {
    const today = startOfDay(new Date());
    return milestones.map((m: any): MilestoneRow => {
      const dateStr = String(m.date ?? '');
      let daysUntil: number | null = null;
      let yearsAgo: number | null = null;
      let isUpcoming = false;
      try {
        const date = parseISO(dateStr);
        if (m.repeatYearly) {
          // For yearly recurrence, compute next occurrence.
          const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
          if (isBefore(next, today)) next.setFullYear(today.getFullYear() + 1);
          daysUntil = differenceInCalendarDays(next, today);
          isUpcoming = true;
        } else if (isAfter(date, today)) {
          daysUntil = differenceInCalendarDays(date, today);
          isUpcoming = true;
        } else {
          yearsAgo = today.getFullYear() - date.getFullYear();
          isUpcoming = false;
        }
      } catch {
        // ignore parse errors
      }
      return {
        id: String(m.id),
        title: String(m.title ?? ''),
        date: dateStr,
        description: m.description ?? null,
        icon: String(m.icon ?? '🎉'),
        repeatYearly: !!m.repeatYearly,
        isUpcoming,
        daysUntil,
        yearsAgo,
      };
    });
  }, [milestones]);

  const stats = useMemo(() => {
    const total = rows.length;
    const upcoming = rows.filter((r) => r.isUpcoming).length;
    const recurring = rows.filter((r) => r.repeatYearly).length;
    const next = rows
      .filter((r) => r.isUpcoming && r.daysUntil != null)
      .slice()
      .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0))[0];
    return { total, upcoming, recurring, next };
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'upcoming') return r.isUpcoming;
      if (filter === 'past') return !r.isUpcoming;
      if (filter === 'recurring') return r.repeatYearly;
      return true;
    });
  }, [rows, filter]);

  const buckets = useMemo<Bucket<MilestoneRow>[]>(() => {
    const groups: Record<string, MilestoneRow[]> = {
      'Coming up': [],
      'This year': [],
      'In time': [],
    };
    const thisYear = new Date().getFullYear();
    for (const r of visible) {
      if (r.isUpcoming) {
        groups['Coming up'].push(r);
      } else {
        try {
          const date = parseISO(r.date);
          if (date.getFullYear() === thisYear) groups['This year'].push(r);
          else groups['In time'].push(r);
        } catch {
          groups['In time'].push(r);
        }
      }
    }
    const order = ['Coming up', 'This year', 'In time'];
    const dotMap: Record<string, string> = {
      'Coming up': C.accent,
      'This year': C.accent2,
      'In time': C.ink3,
    };
    return order
      .filter((k) => groups[k].length > 0)
      .map((k) => ({
        label: k,
        dotColor: dotMap[k],
        rows: groups[k]
          .slice()
          .sort((a, b) => {
            if (k === 'Coming up') {
              return (a.daysUntil ?? Infinity) - (b.daysUntil ?? Infinity);
            }
            return b.date.localeCompare(a.date);
          }),
      }));
  }, [visible, C.accent, C.accent2, C.ink3]);

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'recurring', label: 'Yearly' },
  ];

  const heroEyebrow = stats.next
    ? `NEXT · ${
        stats.next.daysUntil === 0
          ? 'TODAY'
          : stats.next.daysUntil === 1
          ? 'TOMORROW'
          : `IN ${stats.next.daysUntil} DAYS`
      }`
    : 'NO MILESTONES YET';
  const heroTitle = stats.next?.title ?? 'Mark a moment';

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
            <HeaderBrand eyebrow={eyebrowLabel} title="milestones" />
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
              onPress={() => router.push('/sheets/new-milestone' as any)}
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
        {/* Hero — slim status row */}
        <View style={styles.heroWrap}>
          <StatBar
            eyebrow={heroEyebrow}
            meta={
              stats.next
                ? `${format(parseISO(stats.next.date), 'EEE · MMM d')}${stats.next.repeatYearly ? ' · YEARLY' : ''}`
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
                {stats.next ? <PulsingDot color={C.accent} /> : null}
                <Text
                  style={[Typography.mono, { color: C.ink3, marginLeft: 'auto', fontSize: 11 }]}
                  numberOfLines={1}
                >
                  {stats.total} total · {stats.upcoming} ahead · {stats.recurring} yearly
                </Text>
              </>
            }
          />
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          <SegmentedTabs<FilterKey>
            value={filter}
            onChange={setFilter}
            options={filterOptions.map((f) => ({ key: f.key, label: f.label }))}
          />
        </View>

        {/* Bucketed list */}
        <View style={styles.listWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="flag"
              title="No milestones yet"
              body="Pin moments worth remembering — anniversaries, first steps, traditions."
              actionLabel="New milestone"
              onAction={() => router.push('/sheets/new-milestone' as any)}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              rowKey={(m) => m.id}
              renderRow={(m) => (
                <SwipeableRow
                  deleteTitle="Delete milestone?"
                  deleteMessage={`"${m.title}" will be removed.`}
                  onEdit={() =>
                    router.push(`/sheets/new-milestone?id=${m.id}` as any)
                  }
                  onDelete={() => remove(m.id)}
                >
                  <View style={[styles.row, { backgroundColor: C.bgCard }]}>
                    <View style={[styles.iconTile, { backgroundColor: C.accentSoft }]}>
                      <Icon
                        name={resolveMilestoneIcon(m.icon)}
                        size={16}
                        color={C.accent}
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
                          {m.title}
                        </Text>
                        {m.repeatYearly ? (
                          <View
                            style={[
                              styles.recurChip,
                              { backgroundColor: C.accent2Soft },
                            ]}
                          >
                            <Icon
                              name="repeat"
                              size={9}
                              color={C.accent2}
                              strokeWidth={2.4}
                            />
                            <Text
                              style={[
                                Typography.eyebrowSm,
                                { color: C.accent2, fontSize: 9 },
                              ]}
                            >
                              YEARLY
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {m.description ? (
                        <Text
                          style={[Typography.caption, { color: C.ink2, marginTop: 2 }]}
                          numberOfLines={2}
                        >
                          {m.description}
                        </Text>
                      ) : null}
                      <View style={styles.metaRow}>
                        <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>
                          {m.date ? format(parseISO(m.date), 'MMM d, yyyy') : '—'}
                        </Text>
                        {m.isUpcoming && m.daysUntil != null ? (
                          <Text
                            style={[Typography.eyebrowSm, { color: C.accent, fontSize: 9.5 }]}
                          >
                            {m.daysUntil === 0
                              ? 'TODAY'
                              : m.daysUntil === 1
                              ? 'TOMORROW'
                              : `IN ${m.daysUntil}D`}
                          </Text>
                        ) : m.yearsAgo != null && m.yearsAgo > 0 ? (
                          <Text
                            style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9.5 }]}
                          >
                            {m.yearsAgo} {m.yearsAgo === 1 ? 'YR' : 'YRS'} AGO
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
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
    alignItems: 'flex-start',
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
  recurChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
});
