import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import {
  Avatar,
  CardHalo,
  type Tone,
} from '@/src/components/ui/pacto';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useCheckIns } from '@/src/hooks/useCheckIns';
import { useHomeTimeline } from '@/src/hooks/useHomeTimeline';
import { useSession } from '@/src/hooks/useSession';
import { useWeatherStatus } from '@/src/hooks/useWeatherStatus';
import { useHomeChrome } from '@/src/hooks/useHomeChrome';
import HomeHeroGrid from '@/src/components/home/HomeHeroGrid';
import HomeQuickStats from '@/src/components/home/HomeQuickStats';
import HomeUpNext from '@/src/components/home/HomeUpNext';
import { getCheckInStateMeta } from '@/src/constants/checkInStates';
import { Typography } from '@/src/constants/typography';
import { routeForTimelineItem } from '@/src/lib/homeNavigation';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';
import type { FeatureId } from '@/src/lib/features/registry';

const pointerEventsNoneProps = Platform.OS === 'web' ? {} : { pointerEvents: 'none' as const };

function moodFor(key: string | null | undefined) {
  return getCheckInStateMeta(key);
}

function localDateParts(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
}

function isOnLocalDate(occursAt: number | null, date: Date): boolean {
  if (occursAt === null) return false;
  const itemDate = localDateParts(new Date(occursAt));
  const targetDate = localDateParts(date);
  return (
    itemDate.year === targetDate.year &&
    itemDate.month === targetDate.month &&
    itemDate.day === targetDate.day
  );
}

function firstNamePart(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : null;
}

function emailNamePart(email: string | null | undefined): string | null {
  const localPart = email?.trim().split('@')[0]?.trim();
  return localPart || null;
}

function sameColor(a: string | null | undefined, b: string | null | undefined) {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

function homeMoodIconColor(
  moodId: string | null | undefined,
  weatherAccent: string,
  C: ReturnType<typeof useTheme>['C'],
) {
  const moodPalette: Record<string, string> = {
    rough: C.rose,
    low: C.lavender,
    okay: C.accent3,
    steady: C.accent2,
    good: C.success,
    great: C.peach,
  };
  const selected = moodPalette[moodId ?? ''] ?? C.accent2;

  if (!sameColor(selected, weatherAccent)) return selected;
  return sameColor(selected, C.accent3) ? C.rose : C.accent3;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { C, mode: themeMode } = useTheme();
  const session = useSession();
  const { partner, mode, isFeatureEnabled, profile, user, space } = session;
  const home = useHomeTimeline({ previewDays: 30 });
  const weather = useWeatherStatus();
  const checkinsEnabled = isFeatureEnabled('checkins');
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(new Date());
    });
    return () => sub.remove();
  }, []);
  const todayKey = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const { myTodayCheckIn } = useCheckIns({
    enabled: checkinsEnabled,
    checkInDate: todayKey,
    // Home only reads `mood`; skip decrypting notes it never renders.
    decryptNotes: false,
  });
  const dateLabel = useMemo(() => format(today, 'EEE · MMM d').toUpperCase(), [today]);
  const todayRows = useMemo(
    () => home.timeline.filter((row) => isOnLocalDate(row.occursAt, today)).slice(0, 5),
    [home.timeline, today],
  );
  const goalsEnabled = isFeatureEnabled('goals');
  const myMood = moodFor(myTodayCheckIn?.mood);
  const routedTodayRows = useMemo(
    () => todayRows.filter((row) => routeForTimelineItem(row, isFeatureEnabled)),
    [todayRows, isFeatureEnabled],
  );
  const routedTimelineItems = useMemo(
    () => home.timeline.filter((row) => routeForTimelineItem(row, isFeatureEnabled)),
    [home.timeline, isFeatureEnabled],
  );
  const routedComingTimeline = useMemo(
    () => routedTimelineItems[0] ?? null,
    [routedTimelineItems],
  );
  const hasComingUp = !!routedComingTimeline;
  const scheduledItemCount = routedTimelineItems.length;
  const enabledShortcuts = useMemo(
    () => SHORTCUTS.filter((s) => isFeatureEnabled(s.feature)),
    [isFeatureEnabled],
  );

  const partnerFirstName = firstNamePart(partner?.displayName);
  const currentMode = mode ?? (session.isSolo ? 'solo' : session.isCrew ? 'crew' : 'pair');

  // Scroll-driven header pill condense (subtle scale + opacity)
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const pillAnimStyle = useAnimatedStyle(() => {
    const c = interpolate(
      scrollY.value,
      [0, 56],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale: 1 - c * 0.22 }],
      opacity: 1 - c * 0.3,
    };
  });
  const displayName =
    firstNamePart(profile?.displayName) ??
    firstNamePart(user?.displayName) ??
    emailNamePart(user?.email) ??
    partnerFirstName ??
    'you';
  const spaceName =
    space?.name ??
    (currentMode === 'solo' ? 'Just you' : currentMode === 'crew' ? 'Crew space' : partnerFirstName ? `${partnerFirstName} + you` : 'Shared space');

  const isDarkTheme = themeMode === 'dark';
  const {
    homeLightLine,
    homeLightHairline,
    homeQuietHalo,
    homeSideOrb,
    homePanelBg,
    homePanelBorder,
    homePanelHairline,
    homeChrome,
    moodSignal,
    aheadHeatmapPalette,
    aheadTicket,
  } = useHomeChrome(C, isDarkTheme);
  const homeHeroInk = '#F7F0E5';
  const homeWeatherIconAccent = useMemo(
    () =>
      weather.icon === 'sun'
        ? C.accent3
        : weather.icon === 'zap'
          ? C.accent
          : weather.icon === 'cloudRain' || weather.icon === 'cloud' || weather.icon === 'mapPin'
            ? C.sky
            : C.accent2,
    [C, weather.icon],
  );
  const homeMoodIconAccent = useMemo(
    () => homeMoodIconColor(myMood.id, homeWeatherIconAccent, C),
    [myMood.id, homeWeatherIconAccent, C],
  );
  const homeTintTone = useCallback(
    (accent: string): Tone => ({
      bg: alphaColor(accent, isDarkTheme ? 0.24 : 0.18),
      ink: C.inkColor,
      muted: C.ink2,
      border: alphaColor(accent, isDarkTheme ? 0.5 : 0.42),
    }),
    [C, isDarkTheme],
  );
  const shortcutToneFor = useCallback(
    (feature: FeatureId): Tone => {
      if (feature === 'recurring') return homeTintTone(C.rose);
      if (feature === 'calendar') return homeTintTone(C.sky);
      if (feature === 'goals') return homeTintTone(C.lavender);
      return homeTintTone(C.accent2);
    },
    [C, homeTintTone],
  );

  const onHeatmapDayPress = useCallback(
    (day: { dateKey: string }) => {
      if (isFeatureEnabled('calendar')) {
        router.push(`/(tabs)/calendar?date=${day.dateKey}` as any);
      } else {
        router.push('/(tabs)/us' as any);
      }
    },
    [isFeatureEnabled],
  );

  // Distinct days with any activity in the visible 15-week window.
  // Source-of-truth = the same buildActivityHeatmapDays output the heatmap renders.
  const liveDayCount = home.activity.filter((d) => d.count > 0).length;
  // Current consecutive-active-days streak ending today. Walk backwards from
  // the last cell (today) until we hit a day with no activity.
  const activityStreak = useMemo(() => {
    let n = 0;
    for (let i = home.activity.length - 1; i >= 0; i--) {
      if ((home.activity[i]?.count ?? 0) > 0) n += 1;
      else break;
    }
    return n;
  }, [home.activity]);
  const nextItemTitle = routedComingTimeline
    ? routedComingTimeline.title
    : 'Nothing scheduled yet';
  const totalTodayItems = todayRows.length;
  const focusDone = home.todaySummary?.focus?.done ?? 0;
  const focusTotal = home.todaySummary?.focus?.total ?? 0;
  const planDone = home.todaySummary?.plans?.done ?? 0;
  const planTotal = home.todaySummary?.plans?.total ?? 0;
  const heroDone = focusDone + planDone;
  const heroTotal = focusTotal + planTotal;
  const heroProgress = heroTotal > 0 ? Math.min(100, Math.round((heroDone / heroTotal) * 100)) : 0;
  const heroDoneLabel = heroTotal > 0 ? `${heroDone}/${heroTotal} done` : '0 done';
  const taskItems = useMemo(
    () => routedTimelineItems.filter((item) => item.type === 'task'),
    [routedTimelineItems],
  );
  const taskCount = taskItems.length;
  const taskDoneCount = useMemo(
    () => taskItems.filter((item) => item.isCompleted).length,
    [taskItems],
  );
  const taskStat = taskCount > 0 ? `${taskDoneCount}/${taskCount}` : '0';
  const taskStatLabel =
    taskCount > 0 ? `${Math.round((taskDoneCount / taskCount) * 100)}% DONE` : 'NO TASKS';
  const reminderCount = useMemo(
    () => routedTimelineItems.filter((item) => item.type === 'reminder').length,
    [routedTimelineItems],
  );
  const nextRows = (routedTodayRows.length > 0 ? routedTodayRows : routedTimelineItems).slice(0, 3);
  const heatmapActivity = useMemo(() => home.activity.slice(-28), [home.activity]);

  const combinedChartBars = useMemo(() => {
    const base = [taskCount, reminderCount, activityStreak, heroDone, heroTotal - heroDone, scheduledItemCount, liveDayCount, planTotal, focusTotal];
    return base.map((value, index) => ({
      value,
      height: 16 + Math.min(42, Math.max(0, value) * 6 + (index % 3) * 5),
    }));
  }, [activityStreak, focusTotal, heroDone, heroTotal, liveDayCount, planTotal, reminderCount, scheduledItemCount, taskCount]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitleAlign: 'left',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' } as any,
          headerShadowVisible: false,
          headerBackVisible: false,
          title: '',
          headerLeft: () => null,
          headerTitle: () => (
            <Animated.View style={[{ alignSelf: 'flex-start' }, pillAnimStyle]}>
            <PressScale
              onPress={() => router.push('/sheets/profile' as any)}
              haptic="impact"
              pressedScale={0.96}
              style={[
                styles.modeChip,
                { backgroundColor: homePanelBg, borderColor: homePanelBorder },
              ]}
            >
              <Avatar
                person={{
                  displayName: profile?.displayName ?? user?.displayName ?? undefined,
                  avatarUrl: profile?.avatarUrl ?? user?.avatarUrl ?? null,
                  color: C.accent,
                  initial:
                    currentMode === 'crew'
                      ? 'C'
                      : currentMode === 'solo'
                        ? undefined
                        : 'U',
                }}
                size={28}
              />
              <Text
                style={[Typography.captionMedium, { color: C.inkColor, flexShrink: 1 }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <View style={[styles.modeTag, { backgroundColor: C.bgSoft }]}>
                <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                  {currentMode.toUpperCase()}
                </Text>
              </View>
            </PressScale>
            </Animated.View>
          ),
          headerRight: () => (
            <PressScale
              onPress={() => router.push('/notifications' as any)}
              haptic="impact"
              pressedScale={0.9}
              hitSlop={12}
              accessibilityLabel="Notifications"
            >
              <Icon name="bell" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
        }}
      />
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 50, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <HomeHeroGrid
          C={C}
          homeQuietHalo={homeQuietHalo}
          homeChrome={homeChrome}
          homeSideOrb={homeSideOrb}
          homePanelBg={homePanelBg}
          homePanelBorder={homePanelBorder}
          homeHeroInk={homeHeroInk}
          routedComingTimeline={routedComingTimeline}
          goalsEnabled={goalsEnabled}
          nextItemTitle={nextItemTitle}
          heroDoneLabel={heroDoneLabel}
          heroProgress={heroProgress}
          scheduledItemCount={scheduledItemCount}
          checkinsEnabled={checkinsEnabled}
          myTodayCheckIn={myTodayCheckIn}
          myMood={myMood}
          homeMoodIconAccent={homeMoodIconAccent}
          weather={weather}
          homeWeatherIconAccent={homeWeatherIconAccent}
          heatmapActivity={heatmapActivity}
          enabledShortcuts={enabledShortcuts}
          reminderCount={reminderCount}
          taskCount={taskCount}
          today={today}
          isFeatureEnabled={isFeatureEnabled}
          onHeatmapDayPress={onHeatmapDayPress}
          shortcutToneFor={shortcutToneFor}
        />

        <View style={styles.section}>
          <View style={styles.homeSectionTitle}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>QUICK STATS</Text>
          </View>
          <CardHalo lightColor={homeQuietHalo} darkColor={homeQuietHalo}>
          <View
            style={[
              styles.mergedStack,
              { backgroundColor: homePanelBg },
            ]}
          >
            <HomeQuickStats
              C={C}
              homePanelBorder={homePanelBorder}
              homeTintTone={homeTintTone}
              taskStat={taskStat}
              taskStatLabel={taskStatLabel}
              reminderCount={reminderCount}
              activityStreak={activityStreak}
            />

            <HomeUpNext
              C={C}
              homePanelBg={homePanelBg}
              homePanelBorder={homePanelBorder}
              homePanelHairline={homePanelHairline}
              goalsEnabled={goalsEnabled}
              nextRows={nextRows}
              isFeatureEnabled={isFeatureEnabled}
            />
            <View
              {...pointerEventsNoneProps}
              style={[
                styles.railBorderOverlay,
                Platform.OS === 'web' ? styles.pointerEventsNone : null,
                { borderColor: homePanelBorder },
              ]}
            />
          </View>
          </CardHalo>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const SHORTCUTS: {
  icon: IconName;
  label: string;
  route: string;
  feature: FeatureId;
  description: string;
}[] = [
  { icon: 'bell', label: 'Reminder', route: '/sheets/new-reminder', feature: 'recurring', description: 'Ping yourself' },
  { icon: 'calendar', label: 'Calendar', route: '/(tabs)/calendar', feature: 'calendar', description: 'Plan the day' },
  { icon: 'flag', label: 'Target', route: '/sheets/new-plan', feature: 'goals', description: 'Set a goal' },
];

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  modeChip: {
    alignSelf: 'flex-start',
    minHeight: 38,
    maxWidth: 220,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 5,
    paddingRight: 10,
  },
  modeTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mergedStack: {
    position: 'relative',
    marginTop: 0,
    borderRadius: 22,
    overflow: 'hidden',
  },
  railBorderOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 22,
    borderWidth: 1,
    zIndex: 20,
    elevation: 20,
  },
  homeSectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
});
