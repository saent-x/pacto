import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addDays,
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from 'date-fns';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  HeaderBrand,
  Pill,
  StatBar,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import {
  useCheckIns,
  getLocalDateKey,
  type CheckInRecord,
} from '@/src/hooks/useCheckIns';
import { useSession } from '@/src/hooks/useSession';
import { getCheckInStateMeta } from '@/src/constants/checkInStates';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CHECKIN_HISTORY_PAGE_SIZE = 5;

type FilterKey = 'all' | 'mine' | 'theirs';

function checkInDateMs(row: CheckInRecord): number {
  if (row.checkInDate) {
    const parsed = startOfDay(parseISO(row.checkInDate)).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  return timestampMs(row.createdAt) ?? 0;
}

function timestampMs(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function compareCheckIns(a: CheckInRecord, b: CheckInRecord): number {
  return checkInDateMs(b) - checkInDateMs(a) || b.createdAt - a.createdAt;
}

function checkInDisplayDateLabel(row: CheckInRecord): string {
  const timestamp = checkInDateMs(row);
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isToday(date)) {
    const createdAt = timestampMs(row.createdAt);
    return createdAt != null ? format(new Date(createdAt), 'EEE · h:mm a') : 'Today';
  }
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE · MMM d');
}

export default function CheckinsScreen() {
  return (
    <FeatureRouteGuard featureId="checkins">
      <CheckinsScreenInner />
    </FeatureRouteGuard>
  );
}

function CheckinsScreenInner() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, partner, mode, members } = useSession();
  const { checkIns, remove } = useCheckIns();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [earlierVisibleCount, setEarlierVisibleCount] = useState(CHECKIN_HISTORY_PAGE_SIZE);

  const userId = user?.id ?? '';
  const myName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'You').split(' ')[0];
  const myInitial = myName.charAt(0).toUpperCase();
  const partnerName = partner?.displayName ?? null;
  const partnerInitial = (partnerName ?? 'P').charAt(0).toUpperCase();

  const eyebrowLabel =
    mode === 'solo'
      ? 'ME'
      : mode === 'crew'
      ? 'CREW'
      : 'US';

  // Week strip — last Mon→Sun, mood color per day per member
  const week = useMemo(() => {
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    const todayKey = getLocalDateKey(now);
    const syncCheckIns = mode === 'solo'
      ? checkIns
      : checkIns.filter((checkIn) => !checkIn.isPrivate);
    return DAY_LABELS.map((label, i) => {
      const date = addDays(monday, i);
      const dateKey = getLocalDateKey(date);
      const past = dateKey <= todayKey;
      const mineRec = syncCheckIns.find(
        (c) => c.authorId === userId && c.checkInDate === dateKey
      );
      const theirsRec = syncCheckIns.find(
        (c) => c.authorId !== userId && c.checkInDate === dateKey
      );
      return {
        label,
        dateKey,
        past,
        isToday: dateKey === todayKey,
        mineColor: mineRec ? getCheckInStateMeta(mineRec.mood).color : null,
        theirsColor: theirsRec ? getCheckInStateMeta(theirsRec.mood).color : null,
      };
    });
  }, [checkIns, mode, userId]);

  const stats = useMemo(() => {
    const possibleDays = week.filter((d) => d.past).length;
    const myDays = week.filter((d) => d.past && d.mineColor).length;
    const sharedDays = week.filter(
      (d) => d.past && d.mineColor && d.theirsColor
    ).length;
    return { possibleDays, myDays, sharedDays };
  }, [week]);

  // Consecutive-days streak walking back from today (own check-ins).
  const streak = useMemo(() => {
    const myKeys = new Set(
      checkIns
        .filter((c) => c.authorId === userId)
        .map((c) => c.checkInDate)
    );
    let count = 0;
    let cursor = new Date();
    while (myKeys.has(getLocalDateKey(cursor))) {
      count += 1;
      cursor = subDays(cursor, 1);
    }
    return count;
  }, [checkIns, userId]);

  const visible = useMemo(() => {
    return checkIns.filter((c) => {
      if (filter === 'mine') return c.authorId === userId;
      if (filter === 'theirs') return c.authorId !== userId;
      return true;
    });
  }, [checkIns, filter, userId]);

  useEffect(() => {
    setEarlierVisibleCount(CHECKIN_HISTORY_PAGE_SIZE);
  }, [filter]);

  const { buckets, hiddenEarlierCount, earlierTotalCount } = useMemo<{
    buckets: Bucket<CheckInRecord>[];
    hiddenEarlierCount: number;
    earlierTotalCount: number;
  }>(() => {
    const today = startOfDay(new Date()).getTime();
    const yesterday = startOfDay(subDays(new Date(), 1)).getTime();
    const week = startOfDay(subDays(new Date(), 7)).getTime();

    const groups: Record<string, CheckInRecord[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      Earlier: [],
    };
    for (const c of visible) {
      const ts = checkInDateMs(c);
      if (ts >= today) groups.Today.push(c);
      else if (ts >= yesterday) groups.Yesterday.push(c);
      else if (ts >= week) groups['This week'].push(c);
      else groups.Earlier.push(c);
    }

    const order = ['Today', 'Yesterday', 'This week', 'Earlier'];
    const dotMap: Record<string, string> = {
      Today: C.accent,
      Yesterday: C.accent2,
      'This week': C.ink2,
      Earlier: C.ink3,
    };
    const visibleBuckets = order
      .filter((k) => groups[k].length > 0)
      .map((k) => {
        const sorted = groups[k].slice().sort(compareCheckIns);
        const rows = k === 'Earlier' ? sorted.slice(0, earlierVisibleCount) : sorted;
        return {
          label: k,
          dotColor: dotMap[k],
          rows,
          count: sorted.length,
        };
      });
    return {
      buckets: visibleBuckets,
      hiddenEarlierCount: Math.max(0, groups.Earlier.length - earlierVisibleCount),
      earlierTotalCount: groups.Earlier.length,
    };
  }, [visible, C.accent, C.accent2, C.ink2, C.ink3, earlierVisibleCount]);
  const nextEarlierCount = Math.min(CHECKIN_HISTORY_PAGE_SIZE, hiddenEarlierCount);
  const canCollapseEarlier =
    hiddenEarlierCount === 0 && earlierTotalCount > CHECKIN_HISTORY_PAGE_SIZE;
  const canToggleEarlier = hiddenEarlierCount > 0 || canCollapseEarlier;

  const filterOptions: { key: FilterKey; label: string }[] =
    mode === 'solo'
      ? [{ key: 'all', label: 'All' }]
      : [
          { key: 'all', label: 'All' },
          { key: 'mine', label: 'Mine' },
          { key: 'theirs', label: 'Theirs' },
        ];

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
            <HeaderBrand eyebrow={eyebrowLabel} title="check-ins" />
          ),
          headerLeft: () => (
            <PressScale
              onPress={() => router.back()}
              hitSlop={12}
              haptic="impact"
              pressedScale={0.96}
              style={{ padding: 4 }}
            >
              <Icon name="chevronLeft" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              onPress={() => router.push('/sheets/new-checkin' as any)}
              hitSlop={12}
              haptic="impact"
              pressedScale={0.96}
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
        {/* Hero — shared stat header */}
        <View style={styles.heroWrap}>
          <StatBar
            accent={C.accent2}
            eyebrow="THIS WEEK"
            meta={`STREAK · ${streak} ${streak === 1 ? 'DAY' : 'DAYS'}`}
            primary={
              <>
                <View style={styles.heroNumberRow}>
                  <Text style={[styles.heroNumber, { color: C.inkColor }]}>
                    {mode === 'solo' ? stats.myDays : stats.sharedDays}
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: C.ink2, marginLeft: 8 },
                    ]}
                  >
                    of {stats.possibleDays} {mode === 'solo' ? 'logged' : 'in sync'}
                  </Text>
                </View>
                {mode !== 'solo' ? (
                  <Text
                    style={[
                      Typography.caption,
                      { color: C.ink2, flexBasis: '100%', marginTop: 4 },
                    ]}
                  >
                    {stats.myDays} from you · {stats.possibleDays - stats.myDays > 0
                      ? `${stats.possibleDays - stats.myDays} missed`
                      : 'all caught up'}
                  </Text>
                ) : null}
              </>
            }
            microVis={
              <View style={styles.weekPanel}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      Typography.eyebrowSm,
                      { color: C.ink3, marginBottom: 8 },
                    ]}
                  >
                    LAST 7 DAYS
                  </Text>
                  <View style={styles.weekStrip}>
                    {week.map((d, i) => (
                      <View key={i} style={styles.weekCell}>
                        <View style={styles.weekSquares}>
                          <View
                            style={[
                              styles.weekSquare,
                              {
                                backgroundColor:
                                  d.mineColor ?? C.bgSoft,
                                borderWidth: d.isToday ? 1.2 : 0,
                                borderColor: C.inkColor,
                              },
                            ]}
                          />
                          {mode !== 'solo' ? (
                            <View
                              style={[
                                styles.weekSquare,
                                {
                                  backgroundColor:
                                    d.theirsColor ?? C.bgSoft,
                                  marginTop: 2,
                                  borderWidth: d.isToday ? 1.2 : 0,
                                  borderColor: C.inkColor,
                                },
                              ]}
                            />
                          ) : null}
                        </View>
                        <Text
                          style={[
                            Typography.eyebrowSm,
                            { color: C.ink2, fontSize: 9, marginTop: 4 },
                          ]}
                        >
                          {d.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            }
          />
        </View>

        {/* Filter pills */}
        {filterOptions.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filterOptions.map((f) => (
              <Pill
                key={f.key}
                size="md"
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
                color={C.inkColor}
              >
                {f.key === 'theirs' && partnerName
                  ? `${partnerName.split(' ')[0]}'s`
                  : f.label}
              </Pill>
            ))}
          </ScrollView>
        ) : (
          <View style={{ height: 14 }} />
        )}

        {/* Bucketed entries */}
        <View style={styles.listWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="feather"
              title="No check-ins yet"
              body={mode === 'solo' ? 'Log your first mood.' : 'Log the first mood for this pact.'}
              actionLabel="Check in"
              accent={C.accent2}
              onAction={() => router.push('/sheets/new-checkin' as any)}
            />
          ) : (
            <>
              <BucketedList
                buckets={buckets}
                presentation="items"
                swipeableRows
                rowKey={(c) => c.id}
                renderRow={(c) => {
                  const mood = getCheckInStateMeta(c.mood);
                  const isMine = c.authorId === userId;
                  const authorName = isMine
                    ? myName
                    : members.find((m) => m.id === c.authorId)?.displayName?.split(' ')[0] ??
                      'Member';
                  const authorColor = isMine ? C.accent : C.accent2;
                  return (
                    <SwipeableRow
                      deleteTitle="Delete check-in?"
                      deleteMessage="This entry will be removed."
                      onEdit={
                        isMine
                          ? () =>
                              router.push(
                                `/sheets/new-checkin?id=${c.id}` as any
                              )
                          : undefined
                      }
                      onDelete={isMine ? () => remove(c.id) : undefined}
                    >
                      <View style={styles.row}>
                        <View
                          style={[
                            styles.moodTile,
                            { backgroundColor: mood.color },
                          ]}
                        >
                          <Icon name={mood.icon} size={20} color={C.inkColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.headRow}>
                            <Text
                              style={[
                                {
                                  fontFamily: Typography.geistSemiBoldFont,
                                  fontSize: 14,
                                  color: C.inkColor,
                                  textTransform: 'capitalize',
                                },
                              ]}
                            >
                              {mood.label}
                            </Text>
                            <Text
                              style={[Typography.eyebrowSm, { color: authorColor, fontSize: 9.5 }]}
                            >
                              {authorName.toUpperCase()}
                            </Text>
                          </View>
                          {c.note ? (
                            <Text
                              style={[
                                Typography.caption,
                                { color: C.ink2, marginTop: 2 },
                              ]}
                              numberOfLines={3}
                            >
                              {c.note}
                            </Text>
                          ) : null}
                          <Text
                            style={[
                              Typography.mono,
                              { color: C.ink3, fontSize: 11, marginTop: 4 },
                            ]}
                          >
                            {checkInDisplayDateLabel(c)}
                          </Text>
                        </View>
                      </View>
                    </SwipeableRow>
                  );
                }}
              />
              {canToggleEarlier ? (
                <PressScale
                  testID={
                    hiddenEarlierCount > 0
                      ? 'checkins-show-more-earlier'
                      : 'checkins-toggle-earlier'
                  }
                  onPress={() => {
                    if (hiddenEarlierCount > 0) {
                      setEarlierVisibleCount((count) => count + CHECKIN_HISTORY_PAGE_SIZE);
                    } else {
                      setEarlierVisibleCount(CHECKIN_HISTORY_PAGE_SIZE);
                    }
                  }}
                  haptic="selection"
                  style={[
                    styles.showMoreButton,
                    { backgroundColor: C.bgSoft, borderColor: C.lineColor },
                  ]}
                >
                  <Text style={[Typography.captionMedium, { color: C.inkColor }]}>
                    {hiddenEarlierCount > 0 ? `Show ${nextEarlierCount} more` : 'Hide'}
                  </Text>
                </PressScale>
              ) : null}
            </>
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
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  heroNumber: {
    fontFamily: Typography.pixelFont,
    fontSize: 48,
    lineHeight: 48,
    paddingLeft: 8,
  },
  weekPanel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 5,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekSquares: {
    width: '100%',
    alignItems: 'stretch',
  },
  weekSquare: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 2,
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
  showMoreButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  moodTile: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 14,
  },
});
