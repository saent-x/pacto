import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import {
  ActionEmptyState,
  Avatar,
  Bucket,
  BucketedList,
  HeaderBrand,
  PulsingDot,
  SegmentedTabs,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useJournal } from '@/src/hooks/useJournal';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type EntryRow = {
  id: string;
  title: string | null;
  body: string;
  mood: string | null;
  isPrivate: boolean;
  authorId: string;
  authorName: string;
  authorColor: string;
  authorInitial: string;
  entryDate: string;
  createdAt: number;
  isMine: boolean;
};

type FilterKey = 'all' | 'mine' | 'theirs' | 'shared' | 'private';

export default function JournalScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, partner, mode, members } = useSession();
  const { allEntries, remove } = useJournal();

  const [filter, setFilter] = useState<FilterKey>('all');

  const userId = user?.id ?? '';
  const partnerId = partner?.id ?? '';
  const myName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'You').split(' ')[0];
  const partnerName = partner?.displayName ?? null;

  const eyebrowLabel =
    mode === 'solo' ? 'ME' : mode === 'crew' ? 'CREW' : 'US';

  const authorMeta = (id: string): { name: string; color: string } => {
    if (id === userId) return { name: myName, color: C.accent };
    if (id === partnerId)
      return {
        name: (partnerName ?? 'Partner').split(' ')[0],
        color: C.accent2,
      };
    const m = members.find((mm) => mm.id === id);
    return {
      name: m?.displayName?.split(' ')[0] ?? 'Member',
      color: C.accent3,
    };
  };

  const rows = useMemo<EntryRow[]>(() => {
    return allEntries.map((e: any): EntryRow => {
      const meta = authorMeta(e.author_id);
      return {
        id: String(e.id),
        title: e.title ?? null,
        body: String(e.body ?? ''),
        mood: e.mood ?? null,
        isPrivate: !!e.is_private,
        authorId: String(e.author_id ?? ''),
        authorName: meta.name,
        authorColor: meta.color,
        authorInitial: meta.name.charAt(0).toUpperCase(),
        entryDate: String(e.entry_date ?? ''),
        createdAt: e.created_at ? new Date(e.created_at).getTime() : 0,
        isMine: e.author_id === userId,
      };
    });
  }, [allEntries, userId, partnerId, partnerName, myName]);

  const stats = useMemo(() => {
    const total = rows.length;
    const monthMs = startOfMonth(new Date()).getTime();
    const thisMonth = rows.filter((r) => r.createdAt >= monthMs).length;
    const fromMe = rows.filter((r) => r.isMine).length;

    // Streak: consecutive days the user has written own entries.
    const myEntryDays = new Set(
      rows.filter((r) => r.isMine).map((r) => r.entryDate)
    );
    let streak = 0;
    let cursor = new Date();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    while (myEntryDays.has(fmt(cursor))) {
      streak += 1;
      cursor = subDays(cursor, 1);
    }
    return { total, thisMonth, fromMe, streak };
  }, [rows]);

  const featured = useMemo(() => {
    return rows.slice().sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'mine') return r.isMine;
      if (filter === 'theirs') return !r.isMine;
      if (filter === 'shared') return !r.isPrivate;
      if (filter === 'private') return r.isPrivate && r.isMine;
      return true;
    });
  }, [rows, filter]);

  const buckets = useMemo<Bucket<EntryRow>[]>(() => {
    const today = startOfDay(new Date()).getTime();
    const yesterday = startOfDay(subDays(new Date(), 1)).getTime();
    const week = startOfDay(subDays(new Date(), 7)).getTime();

    const groups: Record<string, EntryRow[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      Earlier: [],
    };
    for (const r of visible) {
      const ts = r.createdAt;
      if (ts >= today) groups.Today.push(r);
      else if (ts >= yesterday) groups.Yesterday.push(r);
      else if (ts >= week) groups['This week'].push(r);
      else groups.Earlier.push(r);
    }

    const order = ['Today', 'Yesterday', 'This week', 'Earlier'];
    const dotMap: Record<string, string> = {
      Today: C.accent,
      Yesterday: C.accent2,
      'This week': C.ink2,
      Earlier: C.ink3,
    };
    return order
      .filter((k) => groups[k].length > 0)
      .map((k) => ({
        label: k,
        dotColor: dotMap[k],
        rows: groups[k].slice().sort((a, b) => b.createdAt - a.createdAt),
      }));
  }, [visible, C.accent, C.accent2, C.ink2, C.ink3]);

  const filterOptions: { key: FilterKey; label: string }[] =
    mode === 'solo'
      ? [
          { key: 'all', label: 'All' },
          { key: 'private', label: 'Private' },
        ]
      : [
          { key: 'all', label: 'All' },
          { key: 'mine', label: 'Mine' },
          { key: 'theirs', label: 'Theirs' },
          { key: 'shared', label: 'Shared' },
          { key: 'private', label: 'Private' },
        ];

  const heroEyebrow =
    stats.total === 0
      ? 'A QUIET PAGE'
      : stats.streak > 0
      ? `STREAK · ${stats.streak} ${stats.streak === 1 ? 'DAY' : 'DAYS'}`
      : `${stats.thisMonth} THIS MONTH`;

  const featuredPreview = featured
    ? (featured.title?.trim() || featured.body.split('\n')[0] || '').trim()
    : '';

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
            <HeaderBrand eyebrow={eyebrowLabel} title="journal" />
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
              onPress={() => router.push('/sheets/new-entry' as any)}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon name="edit" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — featured-entry pull-quote, no colored card */}
        <View style={styles.heroWrap}>
          <View style={styles.heroHead}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>{heroEyebrow}</Text>
            <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>
              {stats.total} ENTRIES · {stats.thisMonth} THIS MONTH
              {mode !== 'solo' ? ` · ${stats.fromMe} FROM YOU` : ''}
            </Text>
          </View>

          {featured && featuredPreview ? (
            <View style={styles.featuredBlock}>
              <Text
                style={{
                  fontFamily: Typography.geistFont,
                  fontStyle: 'italic',
                  fontSize: 18,
                  lineHeight: 26,
                  color: C.inkColor,
                  marginTop: 10,
                }}
                numberOfLines={3}
              >
                &ldquo;{featuredPreview}&rdquo;
              </Text>
              <View style={styles.featuredFoot}>
                <Avatar
                  person={{
                    initial: featured.authorInitial,
                    color: featured.authorColor,
                  }}
                  size={20}
                />
                <Text
                  style={[
                    Typography.eyebrowSm,
                    { color: featured.authorColor, fontSize: 9.5 },
                  ]}
                >
                  {featured.authorName.toUpperCase()}
                </Text>
                <Text style={[Typography.mono, { color: C.ink3, fontSize: 10 }]}>
                  {featured.entryDate
                    ? format(parseISO(featured.entryDate), 'MMM d')
                    : format(new Date(featured.createdAt), 'MMM d')}
                </Text>
                {featured.isPrivate ? (
                  <View
                    style={[
                      styles.privateChip,
                      { backgroundColor: C.bgSoft, borderColor: C.lineColor },
                    ]}
                  >
                    <Icon name="lock" size={9} color={C.ink2} strokeWidth={2.2} />
                    <Text
                      style={[
                        Typography.eyebrowSm,
                        { color: C.ink2, fontSize: 9 },
                      ]}
                    >
                      PRIVATE
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <Text
              style={[
                Typography.pixelHeroSm,
                { color: C.inkColor, marginTop: 8 },
              ]}
            >
              Write something
              <PulsingDot color={C.accent3} />
            </Text>
          )}
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          <SegmentedTabs<FilterKey>
            value={filter}
            onChange={setFilter}
            options={filterOptions.map((f) => ({
              key: f.key,
              label:
                f.key === 'theirs' && partnerName
                  ? `${partnerName.split(' ')[0]}'s`
                  : f.label,
            }))}
          />
        </View>

        {/* Bucketed list */}
        <View style={styles.listWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="book"
              title="A quiet page"
              body="Write a sentence about today. A line is enough."
              actionLabel="New entry"
              onAction={() => router.push('/sheets/new-entry' as any)}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              rowKey={(e) => e.id}
              renderRow={(e) => {
                const previewText = e.title?.trim() || e.body.split('\n')[0] || '(empty)';
                const dateLabel = e.createdAt
                  ? isToday(new Date(e.createdAt))
                    ? format(new Date(e.createdAt), 'h:mm a')
                    : isYesterday(new Date(e.createdAt))
                    ? 'Yesterday'
                    : format(new Date(e.createdAt), 'MMM d · h:mm a')
                  : '';
                return (
                  <SwipeableRow
                    deleteTitle="Delete entry?"
                    deleteMessage="This entry will be removed."
                    onEdit={
                      e.isMine
                        ? () =>
                            router.push(
                              `/sheets/new-entry?id=${e.id}` as any
                            )
                        : undefined
                    }
                    onDelete={() => remove(e.id)}
                  >
                    <PressScale
                      onPress={() =>
                        router.push(`/sheets/journal-entry?id=${e.id}` as any)
                      }
                      style={[styles.row, { backgroundColor: C.bgCard }]}
                    >
                      <View
                        style={[
                          styles.dateMargin,
                          { borderLeftColor: e.authorColor },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={styles.headRow}>
                          <Text
                            style={[
                              Typography.bodyMedium,
                              { color: C.inkColor, flex: 1 },
                            ]}
                            numberOfLines={1}
                          >
                            {previewText}
                          </Text>
                          {e.isPrivate ? (
                            <Icon
                              name="lock"
                              size={11}
                              color={C.ink3}
                              strokeWidth={2.2}
                            />
                          ) : null}
                        </View>
                        {e.title && e.body ? (
                          <Text
                            style={[
                              Typography.caption,
                              { color: C.ink2, marginTop: 2 },
                            ]}
                            numberOfLines={2}
                          >
                            {e.body}
                          </Text>
                        ) : null}
                        <View style={styles.metaRow}>
                          <Text
                            style={[
                              Typography.eyebrowSm,
                              { color: e.authorColor, fontSize: 9.5 },
                            ]}
                          >
                            {e.authorName.toUpperCase()}
                          </Text>
                          <Text
                            style={[
                              Typography.mono,
                              { color: C.ink3, fontSize: 11 },
                            ]}
                          >
                            {dateLabel}
                          </Text>
                        </View>
                      </View>
                    </PressScale>
                  </SwipeableRow>
                );
              }}
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
    paddingBottom: 12,
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  featuredBlock: {
    marginBottom: 4,
  },
  featuredFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  privateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
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
  dateMargin: {
    width: 3,
    borderLeftWidth: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
});
