import { router } from 'expo-router';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bucket,
  BucketedList,
  Card,
} from '@/src/components/ui/pacto';
import { Platform } from 'react-native';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useSession } from '@/src/hooks/useSession';
import { useLoveNotes } from '@/src/hooks/useLoveNotes';
import { useCheckIns } from '@/src/hooks/useCheckIns';
import { useExpenses } from '@/src/hooks/useExpenses';
import { useWishlists } from '@/src/hooks/useWishlists';
import { useMilestones } from '@/src/hooks/useMilestones';
import { usePlans } from '@/src/hooks/usePlans';
import { useJournal } from '@/src/hooks/useJournal';
import { useTimetables } from '@/src/hooks/useTimetables';
import { useTasks } from '@/src/hooks/useTasks';
import { useReminders } from '@/src/hooks/useReminders';
import { Typography } from '@/src/constants/typography';
import { featureForUsModule, useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getFeature, isFeatureSupportedForMode } from '@/src/lib/features/registry';
import { useTheme } from '@/src/lib/theme';

type Module = {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  meta: string;
  accentKey: 'a1' | 'a2' | 'a3';
};

export default function UsScreen() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { user, partner, mode, activeCouple, isFeatureEnabled } = useSession();
  const memoryFeedGate = useFeatureGate('memoryFeed');

  const myFirstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'You').split(' ')[0];
  const partnerFirstName = partner?.displayName?.split(' ')[0] ?? null;

  // Anniversary / day count
  const anniversary = activeCouple?.couple?.anniversary;
  const dayCount = useMemo(() => {
    if (!anniversary) return null;
    try {
      const d = differenceInCalendarDays(new Date(), parseISO(anniversary));
      return d >= 0 ? d : null;
    } catch {
      return null;
    }
  }, [anniversary]);

  const yearsTogether = useMemo(() => {
    if (!dayCount) return null;
    return (dayCount / 365).toFixed(1);
  }, [dayCount]);

  // Days until next anniversary
  const daysUntilAnniversary = useMemo(() => {
    if (!anniversary) return null;
    try {
      const ann = parseISO(anniversary);
      const now = new Date();
      const next = new Date(now.getFullYear(), ann.getMonth(), ann.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      return differenceInCalendarDays(next, now);
    } catch {
      return null;
    }
  }, [anniversary]);

  const heroEyebrow = useMemo(() => {
    if (mode === 'solo') return dayCount ? `ME · DAY ${dayCount}` : 'ME';
    if (mode === 'crew') return 'CREW';
    return dayCount ? `US · DAY ${dayCount}` : 'US';
  }, [mode, dayCount]);

  const heroTitle = useMemo(() => {
    if (mode === 'solo') return myFirstName;
    if (mode === 'crew') return activeCouple?.couple?.name || 'Our pact';
    return partnerFirstName ? `${myFirstName} & ${partnerFirstName}` : myFirstName;
  }, [mode, myFirstName, partnerFirstName, activeCouple?.couple?.name]);

  // Module counts (live from hooks)
  const tasks = useTasks();
  const reminders = useReminders();
  const notes = useLoveNotes();
  const checkIns = useCheckIns();
  const expenses = useExpenses();
  const wishlists = useWishlists();
  const milestones = useMilestones();
  const plans = usePlans();
  const journal = useJournal();
  const timetables = useTimetables();

  // Solo-mode equivalent of Together: compute earliest activity (since-when),
  // current consecutive-day streak, and best streak across user-owned items.
  const soloStats = useMemo(() => {
    if (mode !== 'solo') return null;
    const allTs: number[] = [
      ...(notes.notes ?? []).map((x: any) => x.createdAt as number),
      ...(checkIns.checkIns ?? []).map((x: any) => x.createdAt as number),
      ...(expenses.expenses ?? []).map((x: any) => x.createdAt as number),
      ...(wishlists.wishlists ?? []).map((x: any) => x.createdAt as number),
      ...(milestones.milestones ?? []).map((x: any) => x.createdAt as number),
      ...(plans.plans ?? []).map((x: any) => x.createdAt as number),
      ...(journal.entries ?? []).map((x: any) => x.createdAt as number),
      ...(timetables.timetables ?? []).map((x: any) => x.updatedAt as number),
    ].filter((t) => typeof t === 'number' && t > 0);

    if (allTs.length === 0) {
      return { daysSince: 0, sinceDate: null, streak: 0, best: 0 };
    }

    const earliest = Math.min(...allTs);
    const now = new Date();
    const daysSince = Math.max(0, differenceInCalendarDays(now, new Date(earliest)));

    // Build set of local YYYY-MM-DD active days, walk backwards for current
    // streak and scan for best run.
    const dayKeys = new Set<string>();
    for (const t of allTs) {
      dayKeys.add(format(new Date(t), 'yyyy-MM-dd'));
    }

    const dayKeyOf = (d: Date) => format(d, 'yyyy-MM-dd');
    let streak = 0;
    const cursor = new Date(now);
    while (dayKeys.has(dayKeyOf(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Best streak: walk from earliest day to today.
    let best = 0;
    let run = 0;
    const walk = new Date(earliest);
    walk.setHours(0, 0, 0, 0);
    const todayMs = new Date(now);
    todayMs.setHours(0, 0, 0, 0);
    while (walk.getTime() <= todayMs.getTime()) {
      if (dayKeys.has(dayKeyOf(walk))) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
      walk.setDate(walk.getDate() + 1);
    }

    return { daysSince, sinceDate: new Date(earliest), streak, best };
  }, [
    mode,
    notes.notes,
    checkIns.checkIns,
    expenses.expenses,
    wishlists.wishlists,
    milestones.milestones,
    plans.plans,
    journal.entries,
    timetables.timetables,
  ]);

  // 7-day activity ribbon for the solo card footer (last 7 days, today on right).
  const soloWeekDots = useMemo(() => {
    if (mode !== 'solo') return null;
    const now = new Date();
    const dayKeys = new Set<string>();
    const collect = (arr: any[] | undefined) => {
      for (const x of arr ?? []) {
        const timestamp = x?.createdAt ?? x?.updatedAt;
        if (typeof timestamp === 'number') {
          dayKeys.add(format(new Date(timestamp), 'yyyy-MM-dd'));
        }
      }
    };
    collect(notes.notes);
    collect(checkIns.checkIns);
    collect(expenses.expenses);
    collect(wishlists.wishlists);
    collect(milestones.milestones);
    collect(plans.plans);
    collect(journal.entries);
    collect(timetables.timetables);

    const out: { active: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push({ active: dayKeys.has(format(d, 'yyyy-MM-dd')) });
    }
    return out;
  }, [
    mode,
    notes.notes,
    checkIns.checkIns,
    expenses.expenses,
    wishlists.wishlists,
    milestones.milestones,
    plans.plans,
    journal.entries,
    timetables.timetables,
  ]);

  const modules: Module[] = useMemo(
    () => {
      const memoriesFeature = getFeature('memories')!;
      const checkinsFeature = getFeature('checkins')!;
      const wishlistFeature = getFeature('wishlist')!;
      const goalsFeature = getFeature('goals')!;
      const journalFeature = getFeature('journal')!;
      const timetableFeature = getFeature('timetable')!;
      const memoryCount = (notes.notes?.length ?? 0) + (milestones.milestones?.length ?? 0);

      return [
      {
        id: 'memories',
        href: '/(tabs)/us/notes',
        label: memoriesFeature.label,
        icon: memoriesFeature.icon,
        meta: countLabel(memoryCount, 'moment', 'moments'),
        accentKey: 'a1',
      },
      {
        id: 'checkins',
        href: '/(tabs)/us/checkins',
        label: checkinsFeature.label,
        icon: checkinsFeature.icon,
        meta: countLabel(checkIns.checkIns?.length, 'entry', 'entries'),
        accentKey: 'a2',
      },
      {
        id: 'expenses',
        href: '/(tabs)/us/expenses',
        label: 'Expenses',
        icon: 'creditCard',
        meta: countLabel(expenses.expenses?.length, 'item', 'items'),
        accentKey: 'a3',
      },
      {
        id: 'wishlist',
        href: '/(tabs)/us/wishlists',
        label: wishlistFeature.label,
        icon: wishlistFeature.icon,
        meta: countLabel(wishlists.wishlists?.length, 'item', 'items'),
        accentKey: 'a1',
      },
      {
        id: 'goals',
        href: '/(tabs)/us/plans',
        label: goalsFeature.label,
        icon: goalsFeature.icon,
        meta: countLabel(plans.plans?.length, 'goal', 'goals'),
        accentKey: 'a3',
      },
      {
        id: 'journal',
        href: '/(tabs)/us/journal',
        label: journalFeature.label,
        icon: journalFeature.icon,
        meta: countLabel(journal.entries?.length, 'entry', 'entries'),
        accentKey: 'a1',
      },
      {
        id: 'timetable',
        href: '/(tabs)/us/timetables',
        label: timetableFeature.label,
        icon: timetableFeature.icon,
        meta: countLabel(timetables.timetables?.length, 'timetable', 'timetables'),
        accentKey: 'a2',
      },
      {
        id: 'tasks',
        href: '/(tabs)/us/tasks',
        label: 'Tasks',
        icon: 'checkSquare',
        meta: countLabel(tasks.allTasks?.length, 'task', 'tasks'),
        accentKey: 'a1',
      },
      {
        id: 'reminders',
        href: '/(tabs)/us/reminders',
        label: 'Reminders',
        icon: 'repeat',
        meta: countLabel(reminders.reminders?.length, 'reminder', 'reminders'),
        accentKey: 'a2',
      },
      ];
    },
    [
      tasks.allTasks?.length,
      reminders.reminders?.length,
      notes.notes?.length,
      checkIns.checkIns?.length,
      expenses.expenses?.length,
      wishlists.wishlists?.length,
      milestones.milestones?.length,
      plans.plans?.length,
      journal.entries?.length,
      timetables.timetables?.length,
    ]
  );
  const visibleModules = useMemo(
    () =>
      modules.filter((module) => {
        const featureId = featureForUsModule(module.id);
        if (!featureId) return true;
        return isFeatureSupportedForMode(featureId, mode) && isFeatureEnabled(featureId);
      }),
    [modules, mode, isFeatureEnabled],
  );

  const moduleBuckets = useMemo<Bucket<Module>[]>(
    () => [
      {
        label: 'Modules',
        dotColor: C.accent2,
        rows: visibleModules,
      },
    ],
    [visibleModules, C.accent2],
  );

  const accentFor = (k: Module['accentKey']) =>
    k === 'a1' ? C.accent : k === 'a2' ? C.accent2 : C.accent3;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Solo card — same layout as Together, with personal stats. */}
        {mode === 'solo' && soloStats ? (
          <View style={styles.section}>
            <Card padded={false}>
              <View style={styles.togetherBody}>
                <View style={[styles.togetherLeft, { borderRightColor: C.lineColor }]}>
                  <Text style={[Typography.eyebrow, { color: C.ink3 }]}>SOLO</Text>
                  <View style={styles.yearsRow}>
                    <Text style={[styles.yearsBig, { color: C.inkColor }]}>
                      {soloStats.daysSince}
                    </Text>
                    <Text style={[styles.yearsUnit, { color: C.ink3 }]}>
                      {soloStats.daysSince === 1 ? 'day' : 'days'}
                    </Text>
                  </View>
                  {soloStats.sinceDate ? (
                    <Text style={[Typography.mono, { color: C.ink3, marginTop: 6, fontSize: 11 }]}>
                      since {format(soloStats.sinceDate, 'MMM d')}
                    </Text>
                  ) : (
                    <Text style={[Typography.mono, { color: C.ink3, marginTop: 6, fontSize: 11 }]}>
                      no entries yet
                    </Text>
                  )}
                </View>
                <View style={styles.togetherRight}>
                  <Text style={[Typography.eyebrow, { color: C.ink3 }]}>STREAK</Text>
                  <View style={{ marginTop: 'auto' }}>
                    <Text style={[styles.annivDate, { color: C.inkColor }]} numberOfLines={1}>
                      {soloStats.streak} {soloStats.streak === 1 ? 'day' : 'days'}
                    </Text>
                    {soloStats.best > 0 ? (
                      <View style={[styles.daysChip, { backgroundColor: C.accentSoft }]}>
                        <View style={[styles.daysChipDot, { backgroundColor: C.accent }]} />
                        <Text style={[Typography.captionMedium, { color: C.accent }]}>
                          best · {soloStats.best}d
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              {/* 7-day ribbon */}
              {soloWeekDots ? (
                <View style={styles.monthDashRow}>
                  {soloWeekDots.map((d, i) => (
                    <View
                      key={i}
                      style={[
                        styles.monthDash,
                        { backgroundColor: d.active ? C.accent : C.lineColor },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </Card>
          </View>
        ) : null}

        {/* Together card (pair/crew only) */}
        {mode !== 'solo' ? (
          <View style={styles.section}>
            <Card padded={false}>
              <View style={styles.togetherBody}>
                <View style={[styles.togetherLeft, { borderRightColor: C.lineColor }]}>
                  <Text style={[Typography.eyebrow, { color: C.ink3 }]}>
                    {mode === 'crew' ? 'CREW' : 'TOGETHER'}
                  </Text>
                  <View style={styles.yearsRow}>
                    <Text style={[styles.yearsBig, { color: C.inkColor }]}>
                      {yearsTogether ?? '—'}
                    </Text>
                    <Text style={[styles.yearsUnit, { color: C.ink3 }]}>yrs</Text>
                  </View>
                  {anniversary ? (
                    <Text style={[Typography.mono, { color: C.ink3, marginTop: 6, fontSize: 11 }]}>
                      since {format(parseISO(anniversary), 'MMM d')}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.togetherRight}>
                  <Text style={[Typography.eyebrow, { color: C.ink3 }]}>
                    ANNIVERSARY
                  </Text>
                  <View style={{ marginTop: 'auto' }}>
                    <Text
                      style={[styles.annivDate, { color: C.inkColor }]}
                      numberOfLines={1}
                    >
                      {anniversary
                        ? format(parseISO(anniversary), 'MMM d')
                        : 'Add date'}
                    </Text>
                    {daysUntilAnniversary !== null ? (
                      <View
                        style={[
                          styles.daysChip,
                          { backgroundColor: C.accentSoft },
                        ]}
                      >
                        <View
                          style={[styles.daysChipDot, { backgroundColor: C.accent }]}
                        />
                        <Text style={[Typography.captionMedium, { color: C.accent }]}>
                          in {daysUntilAnniversary}{' '}
                          {daysUntilAnniversary === 1 ? 'day' : 'days'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              {/* 12-month progress dashes */}
              <View style={styles.monthDashRow}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.monthDash,
                      {
                        backgroundColor:
                          i < monthsElapsed(anniversary) ? C.accent : C.lineColor,
                      },
                    ]}
                  />
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <PressScale
            onPress={() => router.push('/sheets/new-task')}
            style={[styles.quickAction, { backgroundColor: C.bgSoft }]}
          >
            <Text style={[Typography.body, { color: C.inkColor }]}>+ Task</Text>
          </PressScale>
          <PressScale
            onPress={() => router.push('/sheets/new-reminder')}
            style={[styles.quickAction, { backgroundColor: C.bgSoft }]}
          >
            <Text style={[Typography.body, { color: C.inkColor }]}>+ Reminder</Text>
          </PressScale>
          {memoryFeedGate.enabled ? (
            <PressScale
              onPress={() => router.push('/sheets/memory-composer')}
              style={[styles.quickAction, { backgroundColor: C.bgSoft }]}
            >
              <Text style={[Typography.body, { color: C.inkColor }]}>+ Memory</Text>
            </PressScale>
          ) : null}
        </View>

        {/* Modules grid */}
        <View style={styles.section}>
          <View style={styles.moduleRows}>
            <BucketedList
              buckets={moduleBuckets}
              rowKey={(m) => m.id}
              renderRow={(m) => (
                <PressScale
                  onPress={() => router.push(m.href as any)}
                  style={[
                    styles.moduleRow,
                    { backgroundColor: C.bgCard },
                  ]}
                >
                  <View
                    style={[
                      styles.moduleIcon,
                      { backgroundColor: C.bgSoft },
                    ]}
                  >
                    <Icon name={m.icon} size={16} color={accentFor(m.accentKey)} strokeWidth={2.3} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[Typography.bodyMedium, { color: C.inkColor }]} numberOfLines={1}>
                      {m.label}
                    </Text>
                    <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9.5, marginTop: 3 }]} numberOfLines={1}>
                      {m.meta}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={15} color={C.ink3} strokeWidth={2.2} />
                </PressScale>
              )}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function countLabel(n: number | undefined | null, single: string, plural: string): string {
  if (n == null || n === 0) return `no ${plural}`;
  return n === 1 ? `1 ${single}` : `${n} ${plural}`;
}

function monthsElapsed(anniversary: string | null | undefined): number {
  if (!anniversary) return 0;
  try {
    const ann = parseISO(anniversary);
    const now = new Date();
    const annMonthThisYear = new Date(now.getFullYear(), ann.getMonth(), 1);
    let months = (now.getMonth() - ann.getMonth() + 12) % 12;
    if (now < annMonthThisYear && annMonthThisYear.getMonth() !== now.getMonth()) {
      months = 12 - months;
    }
    return months;
  } catch {
    return 0;
  }
}

const styles = StyleSheet.create({
  topRow: {
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  section: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  togetherBody: {
    flexDirection: 'row',
    padding: 18,
    gap: 16,
  },
  togetherLeft: {
    paddingRight: 16,
    borderRightWidth: 1,
    minWidth: 96,
    justifyContent: 'center',
  },
  togetherRight: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 70,
  },
  yearsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  yearsBig: {
    fontFamily: Typography.pixelFont,
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  yearsUnit: {
    fontFamily: Typography.geistMonoMediumFont,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  annivDate: {
    fontFamily: Typography.pixelFont,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  daysChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
    gap: 6,
  },
  daysChipDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  monthDashRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 2,
  },
  monthDash: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  moduleRows: {
    marginTop: 0,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  moduleIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
