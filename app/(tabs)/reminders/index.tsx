import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  BlockCard,
  DateSectioned,
  Display,
  IconTile,
  Overline,
  Pill,
} from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { ReminderRow } from '@/src/components/reminders/ReminderRow';
import {
  bucketOfDue,
  isOverdue,
  orderReminderBuckets,
} from '@/src/components/reminders/buckets';
import { useReminders } from '@/src/hooks/useReminders';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import type { Reminder } from '@/src/types/database';

type FilterKey = 'All' | 'Mine' | 'Theirs' | 'Shared' | 'Overdue';

// solo-mode: filter set restricted to All/Overdue, partner stat segment hidden
export default function RemindersScreen() {
  const { C, F } = useTheme();
  const { user, activeCouple, isSolo } = useSession();
  const {
    reminders,
    upcoming,
    completed,
    isLoading,
    error,
    toggleComplete,
    snooze,
    remove,
  } = useReminders();

  const [filter, setFilter] = useState<FilterKey>('All');
  const [errorDismissed, setErrorDismissed] = useState(false);

  const youId = user?.id ?? null;
  const partnerId = activeCouple?.partner?.id ?? null;
  const partnerName = activeCouple?.partner?.displayName ?? null;

  const filters: FilterKey[] = useMemo(
    () => (isSolo ? ['All', 'Overdue'] : ['All', 'Mine', 'Theirs', 'Shared', 'Overdue']),
    [isSolo],
  );

  const filterLabel = (f: FilterKey) =>
    f === 'Theirs' && partnerName ? `${partnerName}'s` : f;

  const matchFilter = (r: Reminder) => {
    if (filter === 'All') return true;
    if (filter === 'Mine') return youId != null && r.assigned_to === youId;
    if (filter === 'Theirs') return partnerId != null && r.assigned_to === partnerId;
    if (filter === 'Shared') return r.assigned_to == null;
    if (filter === 'Overdue') return isOverdue(r.due_at, r.is_completed);
    return true;
  };

  const active = upcoming.filter(matchFilter);
  const done = completed.filter(matchFilter);

  const bucketColor: Record<string, string> = {
    Overdue: C.error,
    Today: C.gold,
    Tomorrow: C.peach,
    'This week': C.lavender,
    JAN: C.sky, FEB: C.sky, MAR: C.sky, APR: C.mint,
    MAY: C.sky, JUN: C.butter, JUL: C.butter, AUG: C.butter,
    SEP: C.rose, OCT: C.rose, NOV: C.rose, DEC: C.rose,
  };

  const sections = useMemo(() => {
    const grouped = new Map<string, Reminder[]>();
    active.forEach((r) => {
      const b = bucketOfDue(r.due_at);
      if (!grouped.has(b)) grouped.set(b, []);
      grouped.get(b)!.push(r);
    });
    return orderReminderBuckets(Array.from(grouped.keys())).map((label) => ({
      label: label.toUpperCase(),
      color: bucketColor[label] ?? C.fog,
      items: grouped.get(label)!,
    }));
  }, [active, bucketColor, C.fog]);

  const todayCount = upcoming.filter((r) => bucketOfDue(r.due_at) === 'Today').length;
  const overdueCount = upcoming.filter((r) => isOverdue(r.due_at, r.is_completed)).length;
  const partnerCount = partnerId
    ? upcoming.filter((r) => r.assigned_to === partnerId).length
    : 0;

  if (error && !errorDismissed) {
    return <ErrorState onRetry={() => setErrorDismissed(true)} />;
  }
  if (isLoading && reminders.length === 0) {
    return <IndexSkeleton />;
  }

  const hasAny = reminders.length > 0;

  return (
    <Screen>
      <SummaryCard
        activeCount={active.length}
        doneCount={done.length}
        todayCount={todayCount}
        overdueCount={overdueCount}
        partnerCount={partnerCount}
        showPartner={!isSolo}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
          {filters.map((f) => (
            <Pill
              key={f}
              testID={`reminder-filter-${f}`}
              active={filter === f}
              activeBg={C.reminders}
              activeColor="#fff"
              onPress={() => setFilter(f)}
            >
              {filterLabel(f)}
            </Pill>
          ))}
        </View>
      </ScrollView>

      {!hasAny ? (
        <EmptyReminders />
      ) : sections.length === 0 && done.length === 0 ? (
        <EmptyFiltered />
      ) : (
        <DateSectioned
          sections={sections}
          maxOpen={3}
          renderItem={(r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              youId={youId}
              partnerId={partnerId}
              testID={`reminder-row-${r.id}`}
              onToggle={() => void toggleComplete(r)}
              onSnooze={() => void snooze(r, 60)}
              onDelete={() => void remove(r.id)}
            />
          )}
        />
      )}

      {done.length > 0 ? (
        <View style={{ marginTop: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 4,
              marginBottom: 12,
            }}
          >
            <Icon name="chevronDown" size={12} color={C.fog} />
            <Text
              style={{
                color: C.fog,
                fontSize: 11,
                fontFamily: F.bodyBold,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Completed · {done.length}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {done.map((r) => (
              <ReminderRow
                key={r.id}
                reminder={r}
                youId={youId}
                partnerId={partnerId}
                testID={`reminder-row-${r.id}`}
                onToggle={() => void toggleComplete(r)}
                onSnooze={() => void snooze(r, 60)}
                onDelete={() => void remove(r.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function SummaryCard({
  activeCount,
  doneCount,
  todayCount,
  overdueCount,
  partnerCount,
  showPartner,
}: {
  activeCount: number;
  doneCount: number;
  todayCount: number;
  overdueCount: number;
  partnerCount: number;
  showPartner: boolean;
}) {
  const { C, F } = useTheme();
  const total = Math.max(
    1,
    doneCount + activeCount + overdueCount + (showPartner ? partnerCount : 0),
  );
  const w = (n: number) => Math.max(4, Math.round((n / total) * 100));
  const baseSegs = [
    { w: w(doneCount), c: C.lavenderInk },
    { w: w(activeCount), c: 'rgba(31,22,53,0.45)' },
    { w: w(overdueCount), c: 'rgba(31,22,53,0.3)' },
  ];
  const segs = showPartner
    ? [...baseSegs, { w: w(partnerCount), c: 'rgba(31,22,53,0.18)' }]
    : baseSegs;
  const labels = showPartner
    ? [`DONE ${doneCount}`, `OPEN ${activeCount}`, `SNOOZED ${overdueCount}`, `PARTNER ${partnerCount}`]
    : [`DONE ${doneCount}`, `OPEN ${activeCount}`, `SNOOZED ${overdueCount}`];
  return (
    <BlockCard bg={C.lavender} ink={C.lavenderInk} style={{ marginBottom: 16, padding: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Overline color="rgba(31,22,53,0.7)">This week</Overline>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
            <Display size={54} color={C.lavenderInk}>{`${activeCount}`}</Display>
            <Text
              style={{
                fontSize: 14,
                color: 'rgba(31,22,53,0.6)',
                fontFamily: F.bodyBold,
                marginBottom: 8,
              }}
            >
              active
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: 'rgba(31,22,53,0.7)',
              marginTop: 6,
              fontFamily: F.body,
            }}
          >
            {todayCount} due today · {overdueCount} overdue
          </Text>
        </View>
        <IconTile
          icon="bell"
          bg="rgba(31,22,53,0.15)"
          color={C.lavenderInk}
          size={44}
          radius={14}
          iconSize={20}
        />
      </View>
      <View style={{ marginTop: 16, flexDirection: 'row', gap: 4, height: 6 }}>
        {segs.map((s, i) => (
          <View key={i} style={{ flex: s.w, backgroundColor: s.c, borderRadius: 3 }} />
        ))}
      </View>
      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        {labels.map((t) => (
          <Text
            key={t}
            style={{
              fontSize: 10,
              fontFamily: F.bodyBold,
              letterSpacing: 0.5,
              color: 'rgba(31,22,53,0.75)',
            }}
          >
            {t}
          </Text>
        ))}
      </View>
    </BlockCard>
  );
}

function EmptyReminders() {
  const { C, F } = useTheme();
  return (
    <View
      testID="reminders-empty"
      style={{
        marginTop: 18,
        padding: 22,
        borderRadius: 22,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: C.line,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Icon name="bell" size={22} color={C.fog} />
      <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
        Nothing on deck
      </Text>
      <Text style={{ fontSize: 12, color: C.fog, fontFamily: F.body, textAlign: 'center' }}>
        Tap + in the header to add the first reminder.
      </Text>
    </View>
  );
}

function EmptyFiltered() {
  const { C, F } = useTheme();
  return (
    <View
      testID="reminders-empty-filtered"
      style={{
        marginTop: 6,
        padding: 18,
        borderRadius: 22,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: C.line,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 12, color: C.fog, fontFamily: F.body }}>
        Nothing here yet.
      </Text>
    </View>
  );
}

function IndexSkeleton() {
  const { C } = useTheme();
  return (
    <Screen>
      <Animated.View
        entering={FadeInDown.duration(360)}
        testID="reminders-hero-skeleton"
        style={{
          marginBottom: 16,
          backgroundColor: C.lavender,
          borderRadius: 22,
          height: 160,
          opacity: 0.6,
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            height: 62,
            borderRadius: 18,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            marginBottom: 10,
            opacity: 0.6,
          }}
        />
      ))}
    </Screen>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { C, F } = useTheme();
  return (
    <Screen>
      <Pressable testID="reminders-error-retry" onPress={onRetry}>
        <View
          style={{
            backgroundColor: C.rose,
            borderRadius: 22,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontFamily: F.bodyBold,
              fontSize: 10,
              letterSpacing: 1.4,
              color: 'rgba(0,0,0,0.6)',
              textTransform: 'uppercase',
            }}
          >
            Couldn't load reminders
          </Text>
          <Text style={{ color: C.ink, fontFamily: F.body, marginTop: 4 }}>
            Tap to retry
          </Text>
        </View>
      </Pressable>
    </Screen>
  );
}
