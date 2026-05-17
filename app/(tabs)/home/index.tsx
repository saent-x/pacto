import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { format } from 'date-fns';
import {
  Avatar,
  Card,
  CardHalo,
  ColorTile,
  MonthlyHeatmap,
  type Tone,
} from '@/src/components/ui/pacto';
import { RhythmHybrid } from '@/src/components/ui/pacto/rhythm-variants';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useCheckIns, type CheckInRecord } from '@/src/hooks/useCheckIns';
import { useHomeTimeline } from '@/src/hooks/useHomeTimeline';
import { useSession } from '@/src/hooks/useSession';
import { getCheckInStateMeta } from '@/src/constants/checkInStates';
import { Typography } from '@/src/constants/typography';
import { routeForMilestoneItem, routeForTimelineItem } from '@/src/lib/homeNavigation';
import type { TimelineItem, MilestoneStripItem } from '@/src/lib/home/types';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';
import type { FeatureId } from '@/src/lib/features/registry';

const ARC_BUCKETS = 14;
const ARC_START_HOUR = 6;
const PACTO_AVATAR = require('../../../assets/images/pacto-avatar.png');

type TodayVariant = 'band' | 'pocket' | 'ledger';

function moodFor(key: string | null | undefined) {
  return getCheckInStateMeta(key);
}

type ArcSlot = { color: string | null; height: number; count: number };

const EMPTY_HEIGHT = 6;
const PER_CHECKIN_HEIGHT = 18;

/**
 * Honest sparse arc.
 *
 * 14 hourly buckets from 6am to 7pm. Each bucket renders a bar IFF a
 * check-in actually landed in that hour. Bar height = number of check-ins
 * in the bucket × PER_CHECKIN_HEIGHT (so multiple pings stack visibly).
 * Bar color = mood of the LATEST check-in in that bucket. Empty buckets
 * render a short stub. No carry-forward, no jitter.
 */
function buildArc(checkIns: CheckInRecord[], todayKey: string): ArcSlot[] {
  const today = checkIns
    .filter((c) => c.checkInDate === todayKey)
    .sort((a, b) => a.createdAt - b.createdAt);

  const slots: ArcSlot[] = Array.from({ length: ARC_BUCKETS }, () => ({
    color: null,
    height: EMPTY_HEIGHT,
    count: 0,
  }));

  if (today.length === 0) return slots;

  for (const ci of today) {
    const hour = new Date(ci.createdAt).getHours();
    const idx = hour - ARC_START_HOUR;
    if (idx < 0 || idx >= ARC_BUCKETS) continue; // pre-6am or post-7pm — invisible by design
    const slot = slots[idx];
    slot.count += 1;
    slot.color = getCheckInStateMeta(ci.mood).color;       // most recent wins (sorted asc)
    slot.height = Math.min(36, EMPTY_HEIGHT + slot.count * PER_CHECKIN_HEIGHT);
  }

  return slots;
}

function timeLabel(occursAt: number | null): string {
  if (!occursAt) return 'SOON';
  const date = new Date(occursAt);
  return format(date, 'h:mma').toLowerCase();
}

function dateLabelForTimeline(occursAt: number | null): string {
  if (!occursAt) return 'NO DATE';
  return format(new Date(occursAt), 'EEE · MMM d').toUpperCase();
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

function dateLabelForMilestone(item: MilestoneStripItem): string {
  return format(new Date(`${item.date}T12:00:00`), 'EEE · MMM d').toUpperCase();
}

function memoryDateTypeLabel(item: MilestoneStripItem): string {
  return item.type === 'countdown' ? 'COUNTDOWN' : 'MEMORY DATE';
}

function timelineDot(type: TimelineItem['type']): string {
  switch (type) {
    case 'task':
      return '#C7755A';
    case 'plan':
      return '#6FB3A2';
    case 'event':
      return '#8BA7C9';
    case 'ritual':
      return '#C8AE73';
    case 'memory':
      return '#D08D75';
    case 'reminder':
    default:
      return '#A894C2';
  }
}

function timelineCoverVisual(type: TimelineItem['type']): {
  icon: IconName;
  bg: string;
  ink: string;
  pillBorder: string;
  pillInk: string;
} {
  switch (type) {
    case 'task':
      return {
        icon: 'checkSquare',
        bg: '#F5DDD3',
        ink: '#9F5A40',
        pillBorder: '#D08B6F',
        pillInk: '#8E4A34',
      };
    case 'event':
      return {
        icon: 'calendar',
        bg: '#DDEAF3',
        ink: '#58728C',
        pillBorder: '#8BA7C9',
        pillInk: '#405C75',
      };
    case 'plan':
      return {
        icon: 'flag',
        bg: '#EEE4C8',
        ink: '#A17E31',
        pillBorder: '#D2BC85',
        pillInk: '#765D25',
      };
    case 'ritual':
      return {
        icon: 'repeat',
        bg: '#E7DFD0',
        ink: '#7C6A4D',
        pillBorder: '#B7AA91',
        pillInk: '#65563F',
      };
    case 'memory':
      return {
        icon: 'heart',
        bg: '#F0D4D2',
        ink: '#B06B63',
        pillBorder: '#D89B94',
        pillInk: '#824840',
      };
    case 'reminder':
    default:
      return {
        icon: 'bell',
        bg: '#E3DCF2',
        ink: '#7A67A1',
        pillBorder: '#B8A8E8',
        pillInk: '#5F4E83',
      };
  }
}

function timelineImageUri(item: TimelineItem): string | null {
  const withMedia = item as TimelineItem & {
    imageUrl?: string | null;
    coverImageUrl?: string | null;
    thumbnailUrl?: string | null;
    mediaUrl?: string | null;
    mediaUrls?: string[] | null;
  };
  return (
    withMedia.coverImageUrl ??
    withMedia.imageUrl ??
    withMedia.thumbnailUrl ??
    withMedia.mediaUrl ??
    withMedia.mediaUrls?.[0] ??
    null
  );
}

function comingUpLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'TODAY';
  if (daysUntil === 1) return 'TOMORROW';
  return `IN ${daysUntil} DAYS`;
}

function ArcStrip({ slots }: { slots: ArcSlot[] }) {
  const { C } = useTheme();
  const totalCheckIns = slots.reduce((s, x) => s + x.count, 0);
  const activeBuckets = slots.filter((slot) => slot.count > 0).length;
  const label =
    totalCheckIns === 0
      ? 'NO CHECK-IN YET'
      : totalCheckIns === activeBuckets
        ? `${totalCheckIns} TODAY`
        : `${totalCheckIns} TODAY · ${activeBuckets} HRS`;
  return (
    <View style={[styles.arcStrip, { backgroundColor: C.bgCard }]}>
      <View style={styles.arcHead}>
        <Text style={[Typography.eyebrowSm, { color: C.ink2 }]}>SIGNAL ARC</Text>
        <Text
          style={[
            Typography.mono,
            styles.tabularText,
            { color: C.ink3, fontSize: 10, letterSpacing: 0.4 },
          ]}
        >
          6a · noon · 6p
        </Text>
      </View>
      <View style={styles.arcRow}>
        {slots.map((slot, i) => (
          <View
            key={i}
            style={[
              styles.arcSwatch,
              {
                height: slot.height,
                backgroundColor: slot.color ?? C.bgSoft,
                borderColor: slot.color ? 'transparent' : C.lineColor,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.arcFooter}>
        <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>{label}</Text>
        <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>CHECK-IN READY</Text>
      </View>
    </View>
  );
}

type WeatherStatus =
  | { state: 'loading'; title: string; detail: string; icon: IconName }
  | { state: 'ready'; title: string; detail: string; icon: IconName }
  | { state: 'unavailable'; title: string; detail: string; icon: IconName };

function weatherMeta(code: number | null | undefined): { label: string; icon: IconName } {
  if (code == null) return { label: 'Current conditions', icon: 'cloud' };
  if (code === 0) return { label: 'Clear', icon: 'sun' };
  if ([1, 2, 3].includes(code)) return { label: 'Partly cloudy', icon: 'cloud' };
  if ([45, 48].includes(code)) return { label: 'Foggy', icon: 'cloud' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: 'Rain nearby', icon: 'cloudRain' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snowy', icon: 'cloud' };
  if ([95, 96, 99].includes(code)) return { label: 'Storm watch', icon: 'zap' };
  return { label: 'Weather update', icon: 'cloud' };
}

function useWeatherStatus(): WeatherStatus & { request: () => void } {
  const [status, setStatus] = useState<WeatherStatus>({
    state: 'unavailable',
    title: 'Weather needs location',
    detail: 'Tap to allow local conditions.',
    icon: 'mapPin',
  });

  const loadWeather = useCallback(async ({ requestPermission }: { requestPermission: boolean }) => {
    const fetcher = (globalThis as any).fetch;

    setStatus({
      state: 'loading',
      title: 'Checking weather',
      detail: 'Looking for local conditions.',
      icon: 'cloud',
    });

    if (typeof fetcher !== 'function') {
      setStatus({
        state: 'unavailable',
        title: 'Weather unavailable',
        detail: 'Network access is not available here.',
        icon: 'mapPin',
      });
      return;
    }

    try {
      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus({
          state: 'unavailable',
          title: requestPermission ? 'Location not enabled' : 'Weather needs location',
          detail: requestPermission
            ? 'Allow location in Settings to show weather.'
            : 'Tap to allow local conditions.',
          icon: 'mapPin',
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords ?? {};
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Missing coordinates');
      }
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(3)}` +
        `&longitude=${longitude.toFixed(3)}&current=temperature_2m,weather_code`;
      const response = await fetcher(url);
      if (!response?.ok) throw new Error('Weather request failed');
      const data = await response.json();
      const temp = data?.current?.temperature_2m;
      const code = data?.current?.weather_code;
      const meta = weatherMeta(typeof code === 'number' ? code : null);
      const tempLabel = typeof temp === 'number' ? `${Math.round(temp)}°` : 'Live';
      setStatus({
        state: 'ready',
        title: `${tempLabel} · ${meta.label}`,
        detail: 'Live local weather for today.',
        icon: meta.icon,
      });
    } catch {
      setStatus({
        state: 'unavailable',
        title: 'Weather unavailable',
        detail: 'Live conditions could not be loaded.',
        icon: 'cloud',
      });
    }
  }, []);

  useEffect(() => {
    loadWeather({ requestPermission: false }).catch(() => undefined);
  }, [loadWeather]);

  const request = useCallback(() => {
    loadWeather({ requestPermission: true }).catch(() => undefined);
  }, [loadWeather]);

  return { ...status, request };
}

function timelineSourceLabel(type: TimelineItem['type']): string {
  switch (type) {
    case 'task':
      return 'Task from Tasks';
    case 'plan':
      return 'Target from Targets';
    case 'event':
      return 'Event from Calendar';
    case 'ritual':
      return 'Routine from Recurring';
    case 'memory':
      return 'Memory';
    case 'reminder':
    default:
      return 'Reminder from Recurring';
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { C, mode: themeMode } = useTheme();
  const session = useSession();
  const { partner, mode, isFeatureEnabled, profile, user, space } = session;
  const home = useHomeTimeline({ previewDays: 30 });
  const weather = useWeatherStatus();
  const checkinsEnabled = isFeatureEnabled('checkins');
  const { myTodayCheckIn } = useCheckIns({ enabled: checkinsEnabled });
  const today = useMemo(() => new Date(), []);
  const dateLabel = format(today, 'EEE · MMM d').toUpperCase();
  const todayRows = useMemo(
    () => home.timeline.filter((row) => isOnLocalDate(row.occursAt, today)).slice(0, 5),
    [home.timeline, today],
  );
  const comingMilestone = home.milestones[0] ?? null;
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
  const hasComingUp = !!routedComingTimeline || !!comingMilestone;
  const scheduledItemCount = routedTimelineItems.length + home.milestones.length;
  const enabledShortcuts = useMemo(
    () => SHORTCUTS.filter((s) => isFeatureEnabled(s.feature)),
    [isFeatureEnabled],
  );

  const partnerFirstName = partner?.displayName?.split(' ')[0] ?? null;
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
    profile?.displayName?.split(' ')[0] ??
    user?.displayName?.split(' ')[0] ??
    partnerFirstName ??
    'there';
  const spaceName =
    space?.name ??
    (currentMode === 'solo' ? 'Just you' : currentMode === 'crew' ? 'Crew space' : partnerFirstName ? `${partnerFirstName} + you` : 'Shared space');

  const isDarkTheme = themeMode === 'dark';
  const moodSignal = {
    wrapBg: isDarkTheme ? C.bgCard : C.cardHi,
    cardBg: isDarkTheme ? C.bgCard : C.cardHi,
    border: C.lineColor,
    pillBg: isDarkTheme ? C.bgSoft : C.bgSoft,
    imageBg: isDarkTheme ? C.bgSoft : C.accentSoft,
    ink: C.inkColor,
    muted: C.ink2,
  };
  const aheadHeatmapPalette: [string, string, string, string] = isDarkTheme
    ? [C.lineColor, C.accent2Soft, C.accent2, C.accent]
    : [C.lineColor, C.accent2Soft, C.accent2, C.peach];
  const aheadTicket = {
    cardBg: isDarkTheme ? C.bgCard : C.cardHi,
    border: C.lineColor,
    notchBg: isDarkTheme ? C.accentSoft : C.peach,
    notchInk: isDarkTheme ? C.accent : C.peachInk,
    heatmapBg: 'transparent',
    ink: C.inkColor,
    muted: C.ink2,
    heatmapPalette: aheadHeatmapPalette,
  };

  const aheadTitle =
    currentMode === 'solo' ? 'YOUR RHYTHM' : currentMode === 'crew' ? 'CREW RHYTHM' : 'OUR RHYTHM';
  // Distinct days with any activity in the visible 15-week window.
  // Source-of-truth = the same buildActivityHeatmapDays output the heatmap renders.
  const liveDayCount = home.activity.filter((d) => d.count > 0).length;
  // Current consecutive-active-days streak ending today. Walk backwards from
  // the last cell (today) until we hit a day with no activity.
  const activityStreak = (() => {
    let n = 0;
    for (let i = home.activity.length - 1; i >= 0; i--) {
      if ((home.activity[i]?.count ?? 0) > 0) n += 1;
      else break;
    }
    return n;
  })();
  const nextItemTitle = routedComingTimeline
    ? routedComingTimeline.title
    : comingMilestone
      ? comingMilestone.title
      : 'Nothing scheduled yet';
  const totalTodayItems = todayRows.length;
  const focusDone = home.todaySummary?.focus?.done ?? 0;
  const focusTotal = home.todaySummary?.focus?.total ?? 0;
  const planDone = home.todaySummary?.plans?.done ?? 0;
  const planTotal = home.todaySummary?.plans?.total ?? 0;
  const heroDone = Math.max(focusDone + planDone, totalTodayItems > 0 ? 1 : 0);
  const heroTotal = Math.max(focusTotal + planTotal, totalTodayItems || routedTimelineItems.length || 1);
  const heroProgress = Math.max(8, Math.min(100, Math.round((heroDone / heroTotal) * 100)));
  const taskCount = routedTimelineItems.filter((item) => item.type === 'task').length;
  const reminderCount = routedTimelineItems.filter((item) => item.type === 'reminder').length;
  const nextRows = (routedTodayRows.length > 0 ? routedTodayRows : routedTimelineItems).slice(0, 3);
  const combinedChartBars = useMemo(() => {
    const base = [taskCount, reminderCount, activityStreak, heroDone, heroTotal - heroDone, scheduledItemCount, liveDayCount, planTotal, focusTotal];
    return base.map((value, index) => ({
      value,
      height: 16 + Math.min(42, Math.max(0, value) * 6 + (index % 3) * 5),
    }));
  }, [activityStreak, focusTotal, heroDone, heroTotal, liveDayCount, planTotal, reminderCount, scheduledItemCount, taskCount]);

  const renderAheadCard = () => {
    const nextItemRoute = routedComingTimeline
      ? routeForTimelineItem(routedComingTimeline, isFeatureEnabled)
      : comingMilestone
        ? routeForMilestoneItem(comingMilestone)
        : null;
    const memoryDatesRoute = isFeatureEnabled('memories') ? '/(tabs)/us/milestones' : null;

    return (
      <View>
        <View style={styles.togetherHeadRow}>
          <Text style={[Typography.eyebrow, { color: C.ink3 }]}>
            {aheadTitle}
          </Text>
          <Text
            style={[Typography.eyebrow, styles.tabularText, { color: C.accent2 }]}
          >
            PAST 7 WEEKS
          </Text>
        </View>
        <Card
          elevated
          style={[
            { padding: 18 },
            styles.aheadTicketCard,
            {
              backgroundColor: aheadTicket.cardBg,
              borderColor: aheadTicket.border,
            },
          ]}
        >
          <PressScale
            onPress={() => {
              if (!checkinsEnabled) return;
              router.push('/sheets/new-checkin');
            }}
            disabled={!checkinsEnabled}
            accessibilityLabel={
              activityStreak > 0
                ? `Streak: ${activityStreak} day${activityStreak === 1 ? '' : 's'}. Tap to check in and keep it going.`
                : 'No active streak. Tap to start one.'
            }
            hitSlop={8}
            style={[
              styles.aheadTicketNotch,
              { backgroundColor: aheadTicket.notchBg },
            ]}
          >
            <Text style={[Typography.eyebrowSm, styles.tabularText, { color: aheadTicket.notchInk }]}>
              {activityStreak > 0 ? 'STREAK' : 'BEGIN'}
            </Text>
            {activityStreak > 0 ? (
              <Text
                style={[
                  Typography.eyebrowSm,
                  styles.tabularText,
                  { color: aheadTicket.notchInk, marginTop: 2, fontSize: 13, lineHeight: 14 },
                ]}
              >
                {activityStreak}
              </Text>
            ) : null}
          </PressScale>
          <View style={styles.aheadHeroRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[Typography.pixelHeroSm, { color: aheadTicket.ink }]}
                numberOfLines={1}
              >
                <Text
                  style={[
                    Typography.pixelHeroSm,
                    { color: C.accent2, fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {liveDayCount}
                </Text>
                {liveDayCount === 1 ? ' LIVE DAY' : ' LIVE DAYS'}
              </Text>
              <Text
                style={[
                  Typography.captionMedium,
                  {
                    color: aheadTicket.muted,
                    marginTop: 7,
                  },
                ]}
                numberOfLines={2}
              >
                Days you showed up.
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.activityPanel,
              styles.aheadSignalPanel,
              styles.aheadTicketPanel,
              { borderTopColor: aheadTicket.border },
            ]}
          >
            <RhythmHybrid days={home.activity.slice(-49)} weeks={7} />
          </View>
        </Card>
      </View>
    );
  };

  const renderTodayCard = (variant: TodayVariant) => {
    const isPocket = variant === 'pocket';
    const isLedger = variant === 'ledger';
    const todaySurface = {
      cardBg: isPocket ? C.bgSoft : C.bgCard,
      cardBorder: isPocket ? C.line2 : C.lineColor,
      weatherBg: isLedger
        ? C.accent3Soft
        : isPocket
          ? C.bgCard
          : isDarkTheme
            ? C.accent2Soft
            : C.sky,
      weatherIconBg: isDarkTheme ? C.bgCard : alphaColor(C.skyInk, 0.1),
      weatherInk: isDarkTheme ? C.inkColor : C.skyInk,
      weatherMuted: isDarkTheme ? C.ink2 : alphaColor(C.skyInk, 0.7),
      emptyBg: isLedger ? C.bgSoft : 'transparent',
      emptyBorder: isLedger ? C.lineColor : 'transparent',
    };

    return (
      <View>
        <View style={styles.todayHeadRow}>
          <Text style={[Typography.eyebrow, { color: C.ink3 }]}>TODAY</Text>
          <Text style={[Typography.eyebrow, styles.tabularText, { color: C.ink3 }]}>
            {format(today, 'MMM d').toUpperCase()}
          </Text>
        </View>
        <Card
          padded={false}
          elevated
          style={[
            styles.todayCard,
            isPocket ? styles.todayCardPocket : null,
            isLedger ? styles.todayCardLedger : null,
            {
              backgroundColor: todaySurface.cardBg,
              borderColor: todaySurface.cardBorder,
            },
          ]}
        >
          <PressScale
            testID="home-weather-card"
            onPress={weather.request}
            style={[
              styles.todayWeatherBand,
              isPocket ? styles.todayWeatherPocket : null,
              isLedger ? styles.todayWeatherLedger : null,
              { backgroundColor: todaySurface.weatherBg },
            ]}
          >
            <View style={[styles.todayWeatherIcon, { backgroundColor: todaySurface.weatherIconBg }]}>
              <Icon name={weather.icon} size={18} color={todaySurface.weatherInk} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.todayWeatherTitle, { color: todaySurface.weatherInk }]}
                numberOfLines={1}
              >
                {weather.title}
              </Text>
              <Text
                style={[styles.todayWeatherDetail, { color: todaySurface.weatherMuted }]}
                numberOfLines={1}
              >
                {weather.detail}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={todaySurface.weatherMuted} />
          </PressScale>
          {routedTodayRows.length === 0 ? (
            goalsEnabled ? (
              <PressScale
                testID="home-timeline-empty"
                onPress={() => router.push('/sheets/new-plan' as any)}
                style={[
                  styles.emptyBlock,
                  isLedger ? styles.emptyBlockLedger : null,
                  {
                    backgroundColor: todaySurface.emptyBg,
                    borderColor: todaySurface.emptyBorder,
                  },
                ]}
              >
                <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>
                  No items dated today
                </Text>
                <Text style={[Typography.captionMedium, { color: C.accent, marginTop: 4 }]}>
                  Schedule a target
                </Text>
              </PressScale>
            ) : (
              <View
                testID="home-timeline-empty"
                style={[
                  styles.emptyBlock,
                  isLedger ? styles.emptyBlockLedger : null,
                  {
                    backgroundColor: todaySurface.emptyBg,
                    borderColor: todaySurface.emptyBorder,
                  },
                ]}
              >
                <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>
                  No items dated today
                </Text>
                <Text style={[Typography.caption, { color: C.ink3, marginTop: 4 }]}>
                  Nothing from enabled features is scheduled for today.
                </Text>
              </View>
            )
          ) : routedTodayRows.map((row, i) => {
            const route = routeForTimelineItem(row, isFeatureEnabled);
            return (
              <View key={row.id}>
                {i > 0 ? <View style={[styles.todayDivider, { backgroundColor: C.lineColor }]} /> : null}
                <PressScale
                  testID={`home-timeline-${row.type}-${row.sourceId}`}
                  onPress={() => {
                    if (route) router.push(route as any);
                  }}
                  style={styles.todayRow2}
                >
                  <Text style={[Typography.mono, styles.tabularText, styles.todayTime, { color: C.ink3 }]}>
                    {timeLabel(row.occursAt)}
                  </Text>
                  <View style={[styles.todayDot, { backgroundColor: timelineDot(row.type) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyMedium, { color: C.inkColor }]} numberOfLines={1}>
                      {row.title}
                    </Text>
                    <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]} numberOfLines={1}>
                      {row.subtitle ?? row.type}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={16} color={C.ink3} />
                </PressScale>
              </View>
            );
          })}
        </Card>
      </View>
    );
  };

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
                { backgroundColor: C.bgCard, borderColor: C.lineColor },
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
        <View style={styles.heroSection}>
          <View style={[styles.heroGrid, styles.heroHalo]}>
            {/* LEFT — tall TODAY'S PACTO */}
            <CardHalo style={styles.heroPactoHalo}>
            <PressScale
              haptic="impactMedium"
              pressedScale={0.97}
              onPress={() => {
                const route = routedComingTimeline
                  ? routeForTimelineItem(routedComingTimeline, isFeatureEnabled)
                  : comingMilestone
                    ? routeForMilestoneItem(comingMilestone)
                    : goalsEnabled
                      ? '/sheets/new-plan'
                      : null;
                if (route) router.push(route as any);
              }}
              accessibilityLabel={`Open today's Pacto. ${nextItemTitle}. ${heroDone} of ${heroTotal} done.`}
              style={[
                styles.heroPactoCol,
                { backgroundColor: C.accent, borderColor: C.accent },
              ]}
            >
              <View style={styles.heroOrb} />
              <Image source={PACTO_AVATAR} style={styles.heroPactoMascot} resizeMode="contain" />
              <Text style={[Typography.eyebrowSm, { color: '#FFF5EF' }]}>TODAY'S PACTO</Text>
              <Text
                style={[Typography.pixelHero, styles.heroPactoTitle]}
                numberOfLines={3}
              >
                {nextItemTitle}
              </Text>
              <View style={{ flex: 1 }} />
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${heroProgress}%` }]} />
              </View>
              <View style={styles.heroStatsCol}>
                <Text style={[Typography.captionMedium, styles.heroStatText]} numberOfLines={1}>
                  {heroDone}/{heroTotal} done
                </Text>
                <Text style={[Typography.captionMedium, styles.heroStatText]} numberOfLines={1}>
                  {scheduledItemCount} scheduled
                </Text>
              </View>
            </PressScale>
            </CardHalo>

            {/* RIGHT — stacked check-in + weather */}
            <View style={styles.heroRightCol}>
              <CardHalo style={styles.heroSmallHalo}>
              <PressScale
                testID="home-checkin-card"
                onPress={() => {
                  if (checkinsEnabled) router.push('/sheets/new-checkin' as any);
                }}
                haptic="impact"
                pressedScale={0.97}
                accessibilityLabel={
                  myTodayCheckIn
                    ? `Current signal: ${myMood.label}. Tap to update.`
                    : 'Tap to check in.'
                }
                style={[styles.heroSmallCard, { backgroundColor: C.accent2 }]}
              >
                <Svg
                  style={StyleSheet.absoluteFill}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid slice"
                  pointerEvents="none"
                >
                  <Circle cx="86" cy="92" r="40" fill="rgba(255, 255, 255, 0.14)" />
                  <Circle cx="14" cy="-8" r="22" fill="rgba(255, 255, 255, 0.10)" />
                </Svg>
                <View style={styles.heroSmallTop}>
                  <Text style={[Typography.eyebrowSm, { color: 'rgba(255, 255, 255, 0.82)', letterSpacing: 1.4, flexShrink: 1 }]}>
                    CURRENT SIGNAL
                  </Text>
                  <Image source={myMood.image} style={styles.heroSmallMoodImg} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }} />
                <Text
                  style={[
                    Typography.pixelHero,
                    {
                      color: '#FFFDF7',
                      fontSize: 26,
                      lineHeight: 28,
                      letterSpacing: -0.3,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {myTodayCheckIn ? myMood.label : 'check in'}
                </Text>
              </PressScale>
              </CardHalo>

              <CardHalo style={styles.heroSmallHalo}>
              <PressScale
                testID="home-weather-card"
                onPress={weather.request}
                haptic="impact"
                pressedScale={0.97}
                accessibilityLabel="Local conditions"
                style={[styles.heroSmallCard, { backgroundColor: C.mint }]}
              >
                <Svg
                  style={StyleSheet.absoluteFill}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid slice"
                  pointerEvents="none"
                >
                  <Circle cx="14" cy="92" r="36" fill="rgba(255, 255, 255, 0.16)" />
                  <Circle cx="92" cy="6" r="20" fill="rgba(255, 255, 255, 0.10)" />
                </Svg>
                <View style={styles.heroSmallTop}>
                  <Text
                    style={[
                      Typography.eyebrowSm,
                      { color: alphaColor(C.mintInk, 0.7), letterSpacing: 1.4, flexShrink: 1 },
                    ]}
                    numberOfLines={2}
                  >
                    {weather.state === 'ready' ? 'LOCAL CONDITIONS' : 'TAP TO ENABLE'}
                  </Text>
                  <Icon name={weather.icon} size={42} color={C.mintInk} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }} />
                {weather.state === 'ready' ? (
                  (() => {
                    const sepIdx = weather.title.indexOf(' · ');
                    const tempPart = sepIdx >= 0 ? weather.title.slice(0, sepIdx) : weather.title;
                    const labelPart = sepIdx >= 0 ? weather.title.slice(sepIdx + 3) : '';
                    return (
                      <View>
                        <Text
                          style={{
                            fontFamily: Typography.pixelFont,
                            color: C.mintInk,
                            fontSize: 36,
                            lineHeight: 38,
                            letterSpacing: -0.6,
                            fontVariant: ['tabular-nums'],
                          }}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                        >
                          {tempPart}
                        </Text>
                        {labelPart ? (
                          <Text
                            style={[
                              Typography.captionMedium,
                              { color: C.mintInk, fontSize: 13, lineHeight: 15, marginTop: 2 },
                            ]}
                            numberOfLines={1}
                          >
                            {labelPart}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })()
                ) : (
                  <Text
                    style={[
                      Typography.captionMedium,
                      { color: C.mintInk, fontSize: 14, lineHeight: 16 },
                    ]}
                    numberOfLines={2}
                  >
                    {weather.title}
                  </Text>
                )}
              </PressScale>
              </CardHalo>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <View style={styles.togetherHeadRow}>
              <Text style={[Typography.eyebrow, { color: C.ink3 }]}>ACTIVITY</Text>
              <Text
                style={[Typography.eyebrow, styles.tabularText, { color: C.accent2 }]}
              >
                4 WEEKS
              </Text>
            </View>
            <CardHalo>
              <MonthlyHeatmap
                days={home.activity}
                weeks={4}
                onDayPress={(day) => {
                  if (isFeatureEnabled('calendar')) {
                    router.push(`/(tabs)/calendar?date=${day.dateKey}` as any);
                  } else {
                    router.push('/(tabs)/us' as any);
                  }
                }}
              />
            </CardHalo>
          </View>

          <CardHalo style={styles.shortcutHalo}>
          <View style={styles.shortcutRail}>
            {enabledShortcuts.slice(0, 3).map((s, index) => {
              const tones: Tone[] = [
                { bg: C.accent, ink: '#FFFDF7', muted: alphaColor('#FFFDF7', 0.72) },
                { bg: C.accent2, ink: '#FFFDF7', muted: alphaColor('#FFFDF7', 0.72) },
                { bg: C.lavender, ink: C.lavenderInk, muted: alphaColor(C.lavenderInk, 0.66) },
              ];
              const tone = tones[index % tones.length];
              const stat =
                s.feature === 'recurring'
                  ? String(reminderCount)
                  : s.feature === 'tasks'
                    ? String(routedTimelineItems.filter((item) => item.type === 'task').length)
                    : s.feature === 'calendar'
                      ? format(today, 'EEE').toUpperCase()
                      : 'NEW';
              return (
                <ColorTile
                  key={s.label}
                  tone={tone}
                  title={s.label}
                  icon={s.icon}
                  stat={stat}
                  statLabel={s.description.toUpperCase()}
                  onPress={() => router.push(s.route as any)}
                  accessibilityLabel={`Open ${s.label}. ${s.description}`}
                  style={styles.shortcutSegment}
                />
              );
            })}
          </View>
          </CardHalo>
        </View>

        <View style={styles.section}>
          <View style={styles.homeSectionTitle}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>QUICK STATS</Text>
          </View>
          <CardHalo>
          <View style={styles.mergedStack}>
            <View style={styles.mergedRailRow}>
              <ColorTile
                tone={{
                  bg: C.butter,
                  ink: C.butterInk,
                  muted: alphaColor(C.butterInk, 0.66),
                }}
                title="Tasks this week"
                icon="checkSquare"
                stat={`${taskCount}/${Math.max(taskCount, heroTotal)}`}
                statLabel={`+${Math.max(1, liveDayCount)}% TRACKED`}
                style={styles.mergedRailSegment}
              />
              <ColorTile
                tone={{
                  bg: C.mint,
                  ink: C.mintInk,
                  muted: alphaColor(C.mintInk, 0.66),
                }}
                title={`${reminderCount} reminders tracked`}
                icon="clock"
                stat={activityStreak}
                statLabel="STREAK · DAYS"
                style={styles.mergedRailSegment}
              />
            </View>

            <View
              style={[
                styles.mergedListSection,
                { backgroundColor: C.bgCard, borderTopColor: C.lineColor },
              ]}
            >
              <View style={styles.mergedListHead}>
                <Text style={[Typography.eyebrow, { color: C.ink3 }]}>UP NEXT</Text>
                {goalsEnabled ? (
                  <PressScale
                    testID="home-coming-all"
                    onPress={() => router.push('/(tabs)/us/plans' as any)}
                    hitSlop={8}
                  >
                    <Text style={[Typography.captionMedium, { color: C.accent }]}>See all</Text>
                  </PressScale>
                ) : null}
              </View>

              {nextRows.length === 0 ? (
                goalsEnabled ? (
                  <PressScale
                    testID="home-timeline-empty"
                    onPress={() => router.push('/sheets/new-plan' as any)}
                    haptic="impact"
                    pressedScale={0.98}
                    style={styles.homeListRow}
                  >
                    <View style={[styles.nextCircle, { borderColor: C.line2 }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>No items dated today</Text>
                      <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]}>Schedule a target</Text>
                    </View>
                    <View style={[styles.nextPill, { backgroundColor: C.accentSoft }]}>
                      <Text style={[Typography.eyebrowSm, { color: C.accent }]}>NEW</Text>
                    </View>
                  </PressScale>
                ) : (
                  <View testID="home-timeline-empty" style={styles.homeListRow}>
                    <View style={[styles.nextCircle, { borderColor: C.line2 }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>No items dated today</Text>
                      <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]}>Nothing from enabled features is scheduled for today.</Text>
                    </View>
                  </View>
                )
              ) : nextRows.map((row, index) => {
                const route = routeForTimelineItem(row, isFeatureEnabled);
                const isDone = !!row.isCompleted;
                const rowIcon: IconName =
                  row.type === 'task'
                    ? 'checkSquare'
                    : row.type === 'reminder'
                      ? 'bell'
                      : row.type === 'plan'
                        ? 'flag'
                        : row.type === 'event'
                          ? 'calendar'
                          : 'bookmark';
                return (
                  <View
                    key={row.id}
                    testID={`home-timeline-${row.type}-${row.sourceId}`}
                    onStartShouldSetResponder={() => !!route}
                    onResponderRelease={() => {
                      if (route) router.push(route as any);
                    }}
                    style={[
                      styles.homeListRow,
                      index > 0 ? { borderTopColor: C.lineColor, borderTopWidth: 1 } : null,
                    ]}
                  >
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={[
                        styles.nextIconBadge,
                        isDone
                          ? { backgroundColor: C.accent2Soft }
                          : { backgroundColor: C.bgSoft },
                      ]}
                    >
                      <Icon name={isDone ? 'check' : rowIcon} size={15} color={isDone ? C.accent2 : C.ink2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          Typography.bodyMedium,
                          {
                            color: isDone ? C.ink3 : C.inkColor,
                            textDecorationLine: isDone ? 'line-through' : 'none',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {row.title}
                      </Text>
                      <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]} numberOfLines={1}>
                        {timeLabel(row.occursAt)} · {row.subtitle ?? timelineSourceLabel(row.type)}
                      </Text>
                    </View>
                    <View style={[styles.nextPill, { backgroundColor: isDone ? C.accent2Soft : C.accentSoft }]}>
                      <Text style={[Typography.eyebrowSm, { color: isDone ? C.accent2 : C.accent }]}>
                        {isDone ? 'DONE' : row.occursAt ? 'TODAY' : 'SOON'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
          </CardHalo>
        </View>

        {comingMilestone ? (
          <View style={styles.section}>
          {comingMilestone ? (
            <PressScale
              onPress={() => router.push(routeForMilestoneItem(comingMilestone) as any)}
              haptic="impact"
              pressedScale={0.98}
              style={[styles.loveNote, { backgroundColor: isDarkTheme ? C.bgCard : C.bgCard, borderColor: C.accent }]}
            >
              <Text style={[Typography.eyebrowSm, { color: C.accent }]}>MEMORY DATE</Text>
              <Text style={[Typography.subheading, { color: C.inkColor, marginTop: 4 }]} numberOfLines={2}>
                {comingMilestone.title}
              </Text>
              <Text style={[Typography.caption, { color: C.ink3, marginTop: 5 }]}>
                {comingUpLabel(comingMilestone.daysUntil)} · {dateLabelForMilestone(comingMilestone)}
              </Text>
            </PressScale>
          ) : null}
          </View>
        ) : null}
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
  { icon: 'heart', label: 'Note', route: '/sheets/new-note', feature: 'memories', description: 'Capture a memory' },
  { icon: 'calendar', label: 'Calendar', route: '/(tabs)/calendar', feature: 'calendar', description: 'Plan the day' },
  { icon: 'flag', label: 'Target', route: '/sheets/new-plan', feature: 'goals', description: 'Set a goal' },
];

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  heroSection: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 20,
  },
  fixedHomeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  pactoTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
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
  modeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  greetLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  mascotTile: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mascotImage: {
    width: 44,
    height: 44,
  },
  dayStrip: {
    marginTop: 14,
    minHeight: 78,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  sunPip: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  weatherIconTile: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalShell: {
    marginTop: 14,
    borderRadius: 27,
    padding: 5,
  },
  signalInner: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 70,
  },
  signalIconTile: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalCheckinHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  signalMoodTile: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  signalMoodImg: {
    width: 56,
    height: 56,
  },
  signalChevronTile: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    opacity: 0.7,
  },
  heroShell: {
    marginTop: 14,
    borderRadius: 31,
    padding: 5,
  },
  heroHalo: {
    marginTop: 10,
  },
  heroPactoHalo: {
    flex: 1.05,
    alignSelf: 'stretch',
  },
  heroSmallHalo: {
    flex: 1,
  },
  shortcutHalo: {
    marginTop: 14,
  },
  heroGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  heroPactoCol: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    minHeight: 230,
    overflow: 'hidden',
    position: 'relative',
  },
  heroPactoMascot: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 22,
    height: 22,
    zIndex: 2,
  },
  heroPactoTitle: {
    color: '#fff',
    marginTop: 8,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  heroStatsCol: {
    marginTop: 10,
    gap: 4,
  },
  heroRightCol: {
    flex: 1,
    flexDirection: 'column',
    gap: 12,
  },
  heroSmallCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    overflow: 'hidden',
    minHeight: 109,
  },
  heroSmallTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroSmallMoodImg: {
    width: 60,
    height: 60,
  },
  pactoHero: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    minHeight: 188,
    overflow: 'hidden',
  },
  heroMascot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 62,
    height: 62,
    zIndex: 2,
  },
  heroOrb: {
    position: 'absolute',
    right: -42,
    bottom: -48,
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTitle: {
    color: '#fff',
    maxWidth: '74%',
    marginTop: 8,
  },
  heroProgressTrack: {
    marginTop: 24,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  heroStats: {
    marginTop: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroStatText: {
    color: '#FFF5EF',
    fontVariant: ['tabular-nums'],
  },
  actionTiles: {
    flexDirection: 'row',
    marginTop: 0,
  },
  actionRail: {
    marginTop: 12,
    borderRadius: 24,
    padding: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  shortcutRail: {
    flexDirection: 'row',
    borderRadius: 22,
    overflow: 'hidden',
  },
  shortcutSegment: {
    flex: 1,
    width: 'auto',
    minHeight: 132,
    padding: 12,
    borderRadius: 0,
  },
  mergedStack: {
    marginTop: 0,
    borderRadius: 22,
    overflow: 'hidden',
  },
  cardHalo: {
    borderRadius: 27,
    padding: 5,
  },
  mergedRailRow: {
    flexDirection: 'row',
  },
  mergedRailSegment: {
    flex: 1,
    width: 'auto',
    minHeight: 132,
    padding: 12,
    borderRadius: 0,
  },
  mergedListSection: {
    paddingTop: 12,
    paddingHorizontal: 0,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mergedListHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  actionList: {
    gap: 8,
    marginTop: 16,
  },
  actionRow: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    minHeight: 96,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  actionTileFirst: {
    borderTopLeftRadius: 19,
    borderBottomLeftRadius: 19,
  },
  actionTileLast: {
    borderTopRightRadius: 19,
    borderBottomRightRadius: 19,
  },
  actionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  actionGlyph: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityBrandCard: {
    borderRadius: 22,
  },
  activitySummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  streakPill: {
    minWidth: 66,
    borderRadius: 16,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  activityHeatmapWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  homeSectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
  },
  metricConsole: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  quickCard: {
    flex: 1,
    minHeight: 122,
    gap: 8,
    padding: 16,
  },
  quickHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNum: {
    fontFamily: Typography.pixelFont,
    fontSize: 28,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  quickNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  focusCard: {
    marginTop: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  focusRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: 'rgba(224,111,85,0.28)',
  },
  focusPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCard: {
    borderTopWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  chartLead: {
    width: 92,
    justifyContent: 'space-between',
  },
  chartRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  combinedChart: {
    flex: 1,
    minHeight: 108,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  combinedBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  combinedBar: {
    flex: 1,
    borderRadius: 5,
  },
  combinedLegend: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartMini: {
    flex: 1,
    minHeight: 104,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  chartMiniBars: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  chartMiniBar: {
    flex: 1,
    borderRadius: 4,
  },
  homeListCard: {
    borderRadius: 22,
    padding: 0,
    overflow: 'hidden',
  },
  homeListRow: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextCard: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  nextCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  timelineCard: {
    borderRadius: 18,
    paddingVertical: 8,
  },
  timelinePing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  timelineTime: {
    width: 38,
  },
  timelinePulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakRibbon: {
    marginTop: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  streakIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNum: {
    fontFamily: Typography.pixelFont,
    fontSize: 23,
    lineHeight: 25,
    fontVariant: ['tabular-nums'],
  },
  streakNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  streakSmall: {
    fontFamily: Typography.geistMediumFont,
    fontSize: 12,
    color: '#FFF5EF',
  },
  weekBars: {
    flexDirection: 'row',
    gap: 3,
  },
  weekBar: {
    width: 8,
    height: 22,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  weekBarOn: {
    backgroundColor: '#fff',
  },
  weekBarToday: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  vibesCard: {
    marginTop: 10,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#25243D',
    overflow: 'hidden',
  },
  vibesCover: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E06F55',
  },
  vibesLabel: {
    fontFamily: Typography.geistMonoFont,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.58)',
  },
  vibesTitle: {
    fontFamily: Typography.geistSemiBoldFont,
    fontSize: 13,
    lineHeight: 17,
    color: '#fff',
  },
  vibesBy: {
    fontFamily: Typography.geistFont,
    fontSize: 10,
    lineHeight: 13,
    color: 'rgba(255,255,255,0.68)',
  },
  vibeBars: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  vibeBar: {
    width: 3,
    borderRadius: 2,
  },
  loveNote: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 14,
  },
  momentsStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 18,
  },
  momentCard: {
    width: 86,
    height: 110,
    borderRadius: 16,
    padding: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  momentPill: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    color: '#292D3D',
    fontFamily: Typography.geistMonoFont,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  momentCap: {
    color: '#fff',
    fontFamily: Typography.geistSemiBoldFont,
    fontSize: 10,
    lineHeight: 13,
  },
  momentAdd: {
    width: 86,
    height: 110,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodWrap: {
    borderRadius: 24,
    overflow: 'visible',
    backgroundColor: '#FFFFFF',
  },
  soloMood: {
    padding: 16,
    paddingRight: 52,
    minHeight: 126,
    overflow: 'visible',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  arcStrip: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 23,
    borderBottomRightRadius: 23,
  },
  arcHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arcRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 32,
  },
  arcFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  arcSwatch: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  moodMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  moodDatePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  moodDatePillDark: {
    borderColor: '#4D4537',
    backgroundColor: '#2A2620',
  },
  soloMoodMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soloMoodImageFrame: {
    width: 62,
    height: 62,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  soloMoodStampWrap: {
    borderRadius: 20,
    backgroundColor: '#39322B',
  },
  soloMoodStamp: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#4D4537',
  },
  soloMoodImageStamp: {
    backgroundColor: '#2A2620',
    borderColor: '#4D4537',
  },
  soloMoodChevron: {
    position: 'absolute',
    right: 16,
    top: 70,
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodCard: {
    borderRadius: 24,
    overflow: 'visible',
  },
  moodCardHeader: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingRight: 52,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroBadge: {
    position: 'absolute',
    top: -10,
    right: -6,
    zIndex: 3,
  },
  moodPair: {
    flexDirection: 'row',
  },
  moodHalf: {
    flex: 1,
    padding: 14,
    minHeight: 106,
    justifyContent: 'center',
  },
  moodHalfLeft: {
    borderBottomLeftRadius: 23,
  },
  moodHalfRight: {
    borderBottomRightRadius: 23,
  },
  moodInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  soloMoodIcon: {
    width: 58,
    height: 58,
  },
  inlineMoodIcon: {
    width: 30,
    height: 30,
  },
  inlineMoodImageFrame: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  togetherHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  togetherDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  togetherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  togetherSlotLabelGutter: {
    width: 44,
    paddingRight: 8,
  },
  togetherCellSlot: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  togetherCell: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
  },
  activityPanel: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityHeatmapFrame: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  aheadHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  aheadTicketCard: {
    borderRadius: 20,
    backgroundColor: '#FFFDF7',
    borderColor: '#E8E2D4',
  },
  aheadTicketNotch: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4A68C',
    borderBottomLeftRadius: 12,
  },
  aheadSignalPanel: {
    borderTopColor: '#4D4537',
  },
  aheadTicketPanel: {
    borderTopColor: '#E8E2D4',
  },
  aheadSignalHeatmap: {
    padding: 10,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  aheadTicketHeatmap: {
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  aheadSignalFooter: {
    borderTopColor: '#4D4537',
  },
  aheadFooterButtons: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomLeftRadius: 19,
    borderBottomRightRadius: 19,
    overflow: 'hidden',
    marginTop: 16,
    marginHorizontal: -18,
    marginBottom: -18,
  },
  // Standalone footer — sibling to the Card. No outer borders; just a row
  // with the existing middle vertical divider between the two pressables.
  // softShadow drops a downward-only halo (offset Y +5) so left, bottom, and
  // right read as elevated while the top stays flush against the bordered
  // card above it. Bottom corners rounded to match the rounded card edge
  // visually as one continuous slab.
  aheadFooterStandalone: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: '#FFFDF7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    boxShadow: '0px 5px 14px rgba(0, 0, 0, 0.06)',
  },
  aheadFooterButton: {
    flex: 1,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  aheadFooterButtonPressed: {
    opacity: 0.82,
    transform: [{ translateY: 2 }, { scale: 0.94 }],
  },
  aheadFooterButtonRight: {
    alignItems: 'flex-end',
  },
  aheadFooterDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  todayRow: {
    flexDirection: 'row',
    gap: 10,
  },
  todayHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  todayCard: {
    overflow: 'hidden',
    borderRadius: 24,
  },
  todayCardPocket: {
    padding: 8,
    borderRadius: 22,
  },
  todayCardLedger: {
    padding: 10,
    borderRadius: 18,
  },
  todayWeatherBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 78,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: '#DDEAF3',
  },
  todayWeatherPocket: {
    borderRadius: 16,
  },
  todayWeatherLedger: {
    borderRadius: 12,
    minHeight: 70,
  },
  todayWeatherIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
  },
  todayWeatherTitle: {
    fontFamily: Typography.geistSemiBoldFont,
    fontSize: 18,
    lineHeight: 22,
    color: '#223241',
  },
  todayWeatherDetail: {
    fontFamily: Typography.geistMonoFont,
    fontSize: 13,
    lineHeight: 17,
    color: '#5F6D78',
    marginTop: 2,
  },
  emptyBlock: {
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  emptyBlockLedger: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  todayDivider: {
    height: 1,
    marginHorizontal: 22,
  },
  todayRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 12,
  },
  todayTime: {
    width: 48,
    fontSize: 12,
  },
  todayDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCover: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  comingHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  comingAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  comingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  comingPlanCard: {
    flex: 1.5,
    overflow: 'hidden',
  },
  comingAnnivCard: {
    flex: 1,
    overflow: 'hidden',
  },
  comingCover: {
    height: 130,
    paddingHorizontal: 14,
    paddingTop: 14,
    overflow: 'hidden',
  },
  comingCoverImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  comingCoverDefault: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingCoverDefaultIcon: {
    opacity: 0.72,
  },
  comingPill: {
    alignSelf: 'flex-start',
    zIndex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  comingPlanMeta: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  comingAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  miniAvatarTxt: {
    fontFamily: Typography.geistSemiBoldFont,
    fontSize: 11,
    color: '#FFFFFF',
  },
  annivInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 232,
  },
  annivCount: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  annivProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  annivProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  captureHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  captureDock: {
    flexDirection: 'row',
    gap: 10,
  },
  captureAction: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 66,
    justifyContent: 'center',
  },
  captureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softShadow: {
    boxShadow: '0px 5px 14px rgba(0, 0, 0, 0.06)',
  },
  tabularText: {
    fontVariant: ['tabular-nums'],
  },
});
