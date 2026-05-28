import { router } from 'expo-router';
import { differenceInCalendarDays, format } from 'date-fns';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PulsingStatusDot } from '@/src/components/ui/pacto/PulsingDot';
import {
  CardHalo,
  ColorTile,
  PixelHero,
  type Tone,
} from '@/src/components/ui/pacto';
import type { IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useSession } from '@/src/hooks/useSession';
import { useCheckIns } from '@/src/hooks/useCheckIns';
import { usePlans } from '@/src/hooks/usePlans';
import { useJournal } from '@/src/hooks/useJournal';
import { useTimetables } from '@/src/hooks/useTimetables';
import { useTasks } from '@/src/hooks/useTasks';
import { useReminders } from '@/src/hooks/useReminders';
import { Typography } from '@/src/constants/typography';
import { featureForUsModule } from '@/src/hooks/useFeatureGate';
import { getFeature, isFeatureSupportedForMode } from '@/src/lib/features/registry';
import { useTheme } from '@/src/lib/theme';
import { alphaColor } from '@/src/lib/color';

type Module = {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  meta: string;
  accentKey: 'a1' | 'a2' | 'a3';
};

type ModuleTone = Tone & {
  halo: string;
};

export default function UsScreen() {
  const insets = useSafeAreaInsets();
  const { C, mode: themeMode } = useTheme();
  const { mode, isFeatureEnabled } = useSession();
  const tasksEnabled = isFeatureSupportedForMode('tasks', mode) && isFeatureEnabled('tasks');
  const remindersEnabled = isFeatureSupportedForMode('recurring', mode) && isFeatureEnabled('recurring');
  const checkinsEnabled = isFeatureSupportedForMode('checkins', mode) && isFeatureEnabled('checkins');
  const goalsEnabled = isFeatureSupportedForMode('goals', mode) && isFeatureEnabled('goals');
  const journalEnabled = isFeatureSupportedForMode('journal', mode) && isFeatureEnabled('journal');
  const timetableEnabled = isFeatureSupportedForMode('timetable', mode) && isFeatureEnabled('timetable');

  // Module counts (live from hooks)
  const tasks = useTasks({ enabled: tasksEnabled });
  const reminders = useReminders({ enabled: remindersEnabled });
  const checkIns = useCheckIns({ enabled: checkinsEnabled });
  const plans = usePlans(undefined, { enabled: goalsEnabled });
  const journal = useJournal({ enabled: journalEnabled });
  const timetables = useTimetables({ enabled: timetableEnabled });

  const activitySources = useMemo(
    () => ({
      checkIns: rowsForStats(mode, checkIns.checkIns),
      plans: rowsForStats(mode, plans.plans),
      journalEntries: rowsForStats(mode, journal.entries),
      timetables: rowsForStats(mode, timetables.timetables),
    }),
    [
      mode,
      checkIns.checkIns,
      plans.plans,
      journal.entries,
      timetables.timetables,
    ],
  );

  const activityStats = useMemo(() => {
    const allTs: number[] = [
      ...activitySources.checkIns.map(activityCreatedAt),
      ...activitySources.plans.map(activityCreatedAt),
      ...activitySources.journalEntries.map(activityCreatedAt),
      ...activitySources.timetables.map(activityUpdatedAt),
    ].filter(isActivityTimestamp);

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
  }, [activitySources]);

  // 7-day activity ribbon for the stats card footer (last 7 days, today on right).
  const activityWeekDots = useMemo(() => {
    const now = new Date();
    const dayKeys = new Set<string>();
    const collect = (arr: any[] | undefined) => {
      for (const x of arr ?? []) {
        const timestamp = activityUpdatedAt(x);
        if (timestamp != null) {
          dayKeys.add(format(new Date(timestamp), 'yyyy-MM-dd'));
        }
      }
    };
    collect(activitySources.checkIns);
    collect(activitySources.plans);
    collect(activitySources.journalEntries);
    collect(activitySources.timetables);

    const out: { active: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push({ active: dayKeys.has(format(d, 'yyyy-MM-dd')) });
    }
    return out;
  }, [activitySources]);

  const modules: Module[] = useMemo(
    () => {
      const checkinsFeature = getFeature('checkins')!;
      const goalsFeature = getFeature('goals')!;
      const journalFeature = getFeature('journal')!;
      const timetableFeature = getFeature('timetable')!;

      return [
      {
        id: 'checkins',
        href: '/(tabs)/us/checkins',
        label: checkinsFeature.label,
        icon: checkinsFeature.icon,
        meta: countLabel(checkIns.checkIns?.length, 'entry', 'entries'),
        accentKey: 'a2',
      },
      {
        id: 'goals',
        href: '/(tabs)/us/plans',
        label: goalsFeature.label,
        icon: goalsFeature.icon,
        meta: countLabel(plans.plans?.length, 'target', 'targets'),
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
      checkIns.checkIns?.length,
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

  const heroEyebrow =
    mode === 'solo' ? 'PACTO SOLO' : mode === 'crew' ? 'PACTO CREW' : 'PACTO TOGETHER';
  const statsEyebrow =
    mode === 'solo' ? 'SOLO' : mode === 'crew' ? 'CREW' : 'TOGETHER';

  const isDarkTheme = themeMode === 'dark';
  const moduleToneFor = (moduleId: string): ModuleTone => {
    const accent =
      moduleId === 'checkins' ? C.mint :
      moduleId === 'goals' ? C.sky :
      moduleId === 'journal' ? C.peach :
      moduleId === 'timetable' ? C.butter :
      moduleId === 'tasks' ? C.lavender :
      moduleId === 'reminders' ? C.rose :
      C.accent2;

    return {
      bg: alphaColor(accent, isDarkTheme ? 0.24 : 0.18),
      ink: C.inkColor,
      muted: C.ink2,
      border: alphaColor(accent, isDarkTheme ? 0.5 : 0.42),
      halo: alphaColor(accent, isDarkTheme ? 0.28 : 0.18),
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <PixelHero
          eyebrow={heroEyebrow}
          size="lg"
          accent={C.accent2}
        />

        <View style={styles.statsSection}>
          <View style={styles.togetherPanel}>
            <View style={styles.togetherBody}>
              <View style={[styles.togetherLeft, { borderRightColor: C.lineColor }]}>
                <Text style={[Typography.eyebrow, { color: C.ink3 }]}>{statsEyebrow}</Text>
                <View style={styles.statNumberRow}>
                  <Text style={[styles.statNumber, { color: C.inkColor }]}>
                    {activityStats.daysSince}
                  </Text>
                  <Text style={[styles.statUnit, { color: C.ink3 }]}>
                    {activityStats.daysSince === 1 ? 'day' : 'days'}
                  </Text>
                </View>
                {activityStats.sinceDate ? (
                  <Text style={[Typography.mono, { color: C.ink3, marginTop: 6, fontSize: 11 }]}>
                    since {format(activityStats.sinceDate, 'MMM d')}
                  </Text>
                ) : (
                  <Text style={[Typography.mono, { color: C.ink3, marginTop: 6, fontSize: 11 }]}>
                    no entries yet
                  </Text>
                )}
              </View>
              <View style={styles.togetherRight}>
                <Text style={[Typography.eyebrow, { color: C.ink3 }]}>STREAK</Text>
                <View style={styles.streakValueBlock}>
                  <Text style={[styles.streakValue, { color: C.inkColor }]} numberOfLines={1}>
                    {activityStats.streak} {activityStats.streak === 1 ? 'day' : 'days'}
                  </Text>
                  {activityStats.best > 0 ? (
                    <View style={[styles.daysChip, { backgroundColor: C.accentSoft }]}>
                      <View style={[styles.daysChipDot, { backgroundColor: C.accent }]} />
                      <Text style={[Typography.captionMedium, { color: C.accent }]}>
                        best · {activityStats.best}d
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={styles.monthDashRow}>
              {activityWeekDots.map((d, i) => (
                <View
                  key={i}
                  style={[
                    styles.monthDash,
                    { backgroundColor: d.active ? C.accent : C.lineColor },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <PressScale
            onPress={() => router.push('/sheets/new-list')}
            accessibilityLabel="Create task list"
            haptic="impact"
            pressedScale={0.96}
            style={[styles.quickAction, { backgroundColor: C.bgSoft }]}
          >
            <Text style={[Typography.body, { color: C.inkColor }]}>+ List</Text>
          </PressScale>
          <PressScale
            onPress={() => router.push('/sheets/new-reminder')}
            accessibilityLabel="Create reminder"
            haptic="impact"
            pressedScale={0.96}
            style={[styles.quickAction, { backgroundColor: C.bgSoft }]}
          >
            <Text style={[Typography.body, { color: C.inkColor }]}>+ Reminder</Text>
          </PressScale>
          {timetableEnabled ? (
            <PressScale
              onPress={() => router.push('/sheets/new-timetable')}
              accessibilityLabel="Create timetable"
              haptic="impact"
              pressedScale={0.96}
              style={[styles.quickAction, { backgroundColor: C.bgSoft }]}
            >
              <Text style={[Typography.body, { color: C.inkColor }]}>+ Timetable</Text>
            </PressScale>
          ) : null}
        </View>

        {/* Modules grid */}
        <View style={styles.section}>
          <View style={styles.modulesHead}>
            <View style={styles.modulesHeadLeft}>
              <PulsingStatusDot color={C.accent2} size={6} />
              <Text style={[Typography.eyebrow, { color: C.ink3 }]}>ACTIVE TOOLS</Text>
              <Text style={[Typography.eyebrow, { color: C.ink3, opacity: 0.6 }]}>
                · {visibleModules.length}
              </Text>
            </View>
          </View>
          <View style={styles.moduleGrid}>
            {visibleModules.map((m) => {
              const tone = moduleToneFor(m.id);
              const count = parseInt(m.meta.match(/\d+/)?.[0] ?? '0', 10);
              const unit = m.meta.replace(/^[\d,]+\s*/, '').toUpperCase() || m.meta.toUpperCase();
              return (
                <CardHalo
                  key={m.id}
                  lightColor={tone.halo}
                  darkColor={tone.halo}
                  style={styles.moduleTileHalo}
                >
                  <ColorTile
                    tone={tone}
                    title={m.label}
                    icon={m.icon}
                    stat={count}
                    statLabel={unit}
                    dotsTotal={7}
                    dotsFilled={Math.min(7, count)}
                    onPress={() => router.push(m.href as any)}
                    accessibilityLabel={`Open ${m.label}. ${m.meta}`}
                    style={styles.moduleTileFill}
                  />
                </CardHalo>
              );
            })}
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

function rowsForStats(mode: string, rows: any[] | undefined): any[] {
  const list = rows ?? [];
  if (mode === 'solo') return list;
  return list.filter((row) => !isPersonalActivityRow(row));
}

function isPersonalActivityRow(row: any): boolean {
  return (
    row?.isPrivate === true ||
    row?.is_private === true ||
    row?.scope === 'personal' ||
    row?.share === 'solo'
  );
}

function activityCreatedAt(row: any): number | null {
  return activityTimestamp(row?.createdAt ?? row?.created_at);
}

function activityUpdatedAt(row: any): number | null {
  return activityTimestamp(row?.updatedAt ?? row?.updated_at ?? row?.createdAt ?? row?.created_at);
}

function activityTimestamp(value: unknown): number | null {
  if (typeof value === 'number') return validActivityTimestamp(value);
  if (typeof value === 'string' && value.trim()) {
    if (!hasValidDatePrefix(value)) return null;
    const parsed = Date.parse(value);
    return validActivityTimestamp(parsed);
  }
  return null;
}

function validActivityTimestamp(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Number.isFinite(new Date(value).getTime()) ? value : null;
}

function isActivityTimestamp(value: number | null): value is number {
  return typeof value === 'number';
}

function hasValidDatePrefix(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return true;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  statsSection: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  togetherPanel: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  togetherBody: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 16,
  },
  togetherLeft: {
    paddingRight: 16,
    borderRightWidth: 1,
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  togetherRight: {
    flex: 1,
    minHeight: 70,
  },
  streakValueBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  statNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  statNumber: {
    fontFamily: Typography.pixelFont,
    fontSize: 42,
    lineHeight: 42,
    letterSpacing: 0,
    paddingLeft: 8,
  },
  statUnit: {
    fontFamily: Typography.geistMonoMediumFont,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  streakValue: {
    fontFamily: Typography.pixelFont,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: 0,
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
    paddingHorizontal: 24,
    paddingBottom: 14,
    gap: 2,
  },
  monthDash: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  modulesHead: {
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  modulesHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleTileHalo: {
    width: '48%',
  },
  moduleTileFill: {
    width: '100%',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 12,
  },
});
