import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActionEmptyState,
  BucketedList,
  Bucket,
  Checkbox,
  Pill,
  PriorityDot,
  ScopeChip,
  StatBar,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import {
  bucketOfDue,
  formatWhenChip,
  isOverdue,
  orderReminderBuckets,
} from '@/src/components/reminders/buckets';
import { useReminders } from '@/src/hooks/useReminders';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import type { Reminder } from '@/src/types/database';

type FilterKey = 'All' | 'Mine' | 'Theirs' | 'Shared' | 'Overdue';

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { user, partner, mode } = useSession();
  const { reminders, upcoming, toggleComplete, remove } = useReminders();

  const [filter, setFilter] = useState<FilterKey>('All');

  const isSolo = mode === 'solo';
  const youId = user?.id ?? null;
  const partnerId = partner?.id ?? null;
  const partnerName = partner?.displayName ?? null;

  const filters: FilterKey[] = useMemo(
    () => (isSolo ? ['All', 'Overdue'] : ['All', 'Mine', 'Theirs', 'Shared', 'Overdue']),
    [isSolo]
  );

  const overdueCount = useMemo(
    () => upcoming.filter((r) => isOverdue(r.due_at, r.is_completed)).length,
    [upcoming]
  );

  const nextReminder = useMemo(() => {
    const sorted = upcoming
      .filter((r) => !isOverdue(r.due_at, r.is_completed))
      .slice()
      .sort((a, b) => a.due_at.localeCompare(b.due_at));
    return sorted[0] ?? null;
  }, [upcoming]);

  const todayCount = useMemo(
    () => upcoming.filter((r) => bucketOfDue(r.due_at) === 'Today').length,
    [upcoming]
  );

  const doneCount = reminders.filter((r) => r.is_completed).length;
  const activeCount = upcoming.length;

  const visible: Reminder[] = useMemo(() => {
    return reminders.filter((r) => {
      if (filter === 'Overdue') return isOverdue(r.due_at, r.is_completed);
      if (filter === 'Mine') return r.assigned_to === youId;
      if (filter === 'Theirs') return r.assigned_to && r.assigned_to === partnerId;
      if (filter === 'Shared') return !r.assigned_to;
      return true;
    });
  }, [reminders, filter, youId, partnerId]);

  const buckets = useMemo<Bucket<Reminder>[]>(() => {
    const groups = new Map<string, Reminder[]>();
    for (const r of visible) {
      const label = isOverdue(r.due_at, r.is_completed)
        ? 'Overdue'
        : bucketOfDue(r.due_at);
      const list = groups.get(label) ?? [];
      list.push(r);
      groups.set(label, list);
    }
    const order = orderReminderBuckets(Array.from(groups.keys()));
    return order
      .filter((label) => (groups.get(label)?.length ?? 0) > 0)
      .map((label) => ({
        label,
        dotColor:
          label === 'Overdue'
            ? C.accent
            : label === 'Today'
            ? C.inkColor
            : C.ink2,
        rows: (groups.get(label) ?? []).slice().sort((a, b) =>
          a.due_at.localeCompare(b.due_at)
        ),
      }));
  }, [visible, C.accent, C.inkColor, C.ink2]);

  const scopeFor = (r: Reminder): 'mine' | 'partner' | 'shared' => {
    if (!r.assigned_to) return 'shared';
    if (r.assigned_to === youId) return 'mine';
    if (r.assigned_to === partnerId) return 'partner';
    return 'shared';
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <StatBar
            eyebrow={overdueCount > 0 ? 'NEEDS ATTENTION' : nextReminder ? 'NEXT REMINDER' : 'THIS WEEK'}
            meta={`${todayCount} TODAY · ${doneCount} DONE`}
            primary={
              <>
                <Text style={[Typography.pixelHeroSm, { color: C.inkColor }]}>
                  {overdueCount > 0 ? overdueCount : activeCount}
                </Text>
                <Text style={[Typography.bodyMedium, { color: C.ink2 }]}>
                  {overdueCount > 0 ? 'overdue' : 'active'}
                </Text>
                {nextReminder ? (
                  <Text
                    style={[Typography.caption, { color: C.ink3, marginLeft: 'auto' }]}
                    numberOfLines={1}
                  >
                    {formatWhenChip(nextReminder.due_at)} · {nextReminder.title}
                  </Text>
                ) : null}
              </>
            }
          />
        </View>

        {activeCount === 0 && reminders.length === 0 ? (
          <View style={styles.listWrap}>
            <ActionEmptyState
              icon="bell"
              title="No reminders yet"
              body="Add one thing worth remembering and assign it to yourself or the pact."
              actionLabel="New reminder"
              onAction={() => router.push('/sheets/new-reminder' as any)}
            />
          </View>
        ) : (
          <>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <Pill
              key={f}
              size="md"
              active={filter === f}
              onPress={() => setFilter(f)}
              color={C.inkColor}
            >
              {f === 'Theirs' && partnerName ? `${partnerName.split(' ')[0]}'s` : f}
            </Pill>
          ))}
        </ScrollView>

        <View style={styles.listWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="filter"
              title="Nothing in this view"
              body="Try another filter or add a reminder."
              actionLabel="New reminder"
              onAction={() => router.push('/sheets/new-reminder' as any)}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              rowKey={(r) => r.id}
              renderRow={(r) => (
                <SwipeableRow
                  deleteTitle="Delete reminder?"
                  deleteMessage={`"${r.title}" will be removed.`}
                  onEdit={() =>
                    router.push({
                      pathname: '/sheets/new-reminder',
                      params: { id: r.id },
                    } as any)
                  }
                  onDelete={() => remove(r.id)}
                >
                  <View
                    style={[
                      styles.row,
                      styles.rowPadding,
                      { backgroundColor: C.bgCard },
                    ]}
                  >
                    <Checkbox
                      checked={r.is_completed}
                      onChange={() => toggleComplete(r)}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          Typography.bodyMedium,
                          {
                            color: r.is_completed ? C.ink3 : C.inkColor,
                            textDecorationLine: r.is_completed ? 'line-through' : 'none',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {r.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>
                          {formatWhenChip(r.due_at)}
                        </Text>
                        {r.recurrence && r.recurrence !== 'none' ? (
                          <View style={styles.metaItem}>
                            <Icon name="repeat" size={11} color={C.ink3} strokeWidth={2} />
                            <Text style={[Typography.mono, { color: C.ink3, fontSize: 10 }]}>
                              {r.recurrence}
                            </Text>
                          </View>
                        ) : null}
                        <PriorityDot level={priorityLevel(r.priority)} />
                        <ScopeChip scope={scopeFor(r)} mode={mode} partnerName={partnerName} />
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
              )}
            />
          )}
        </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function priorityLevel(p: number): 'none' | 'low' | 'med' | 'high' {
  if (p >= 3) return 'high';
  if (p === 2) return 'med';
  if (p === 1) return 'low';
  return 'none';
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  heroCard: {
    padding: 20,
    borderWidth: 0,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  heroNumber: {
    fontFamily: Typography.pixelFont,
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: -1,
  },
  bellTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  filterRow: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 6,
  },
  listWrap: {
    paddingHorizontal: 18,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowPadding: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
