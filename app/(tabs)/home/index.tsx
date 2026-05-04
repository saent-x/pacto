import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { format } from 'date-fns';
import {
  ActivityHeatmap,
  Card,
  HeroPactoBadge,
  SectionHead,
} from '@/src/components/ui/pacto';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useCheckIns, getLocalDateKey, type CheckInRecord } from '@/src/hooks/useCheckIns';
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

  const request = useCallback(async () => {
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
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus({
          state: 'unavailable',
          title: 'Location not enabled',
          detail: 'Allow location in Settings to show weather.',
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
  const { partner, mode, isFeatureEnabled } = useSession();
  const home = useHomeTimeline({ previewDays: 30 });
  const weather = useWeatherStatus();
  const checkinsEnabled = isFeatureEnabled('checkins');
  const { todayCheckIn, partnerTodayCheckIn, checkIns } = useCheckInSnapshot(checkinsEnabled);
  const today = useMemo(() => new Date(), []);
  const dateLabel = format(today, 'EEE · MMM d').toUpperCase();
  const todayRows = useMemo(
    () => home.timeline.filter((row) => isOnLocalDate(row.occursAt, today)).slice(0, 5),
    [home.timeline, today],
  );
  const comingMilestone = home.milestones[0] ?? null;
  const goalsEnabled = isFeatureEnabled('goals');
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
  const myMood = moodFor(todayCheckIn?.mood);
  const partnerMood = moodFor(partnerTodayCheckIn?.mood);

  const todayKey = getLocalDateKey();
  const arcSlots = useMemo(() => buildArc(checkIns, todayKey), [checkIns, todayKey]);

  const onCheckIn = () => {
    if (checkinsEnabled) router.push('/sheets/new-checkin');
  };

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

  const renderSoloMoodCard = () => {
    return (
      <PressScale
        onPress={onCheckIn}
        accessibilityLabel="Update check-in"
        accessibilityHint="Opens the check-in sheet"
        style={[
          styles.moodWrap,
          styles.softShadow,
          styles.soloMoodStampWrap,
          { backgroundColor: moodSignal.wrapBg },
        ]}
      >
        <HeroPactoBadge style={styles.heroBadge} />
        <View
          style={[
            styles.soloMood,
            styles.soloMoodStamp,
            {
              backgroundColor: moodSignal.cardBg,
              borderColor: moodSignal.border,
            },
          ]}
        >
          <View style={styles.moodMetaRow}>
            <View
              style={[
                styles.moodDatePill,
                styles.moodDatePillDark,
                {
                  backgroundColor: moodSignal.pillBg,
                  borderColor: moodSignal.border,
                },
              ]}
            >
              <Text style={[Typography.eyebrowSm, styles.tabularText, { color: moodSignal.muted }]}>
                {dateLabel}
              </Text>
            </View>
          </View>
          <View style={styles.soloMoodMain}>
            <View
              style={[
                styles.soloMoodImageFrame,
                styles.soloMoodImageStamp,
                {
                  backgroundColor: moodSignal.imageBg,
                  borderColor: moodSignal.border,
                },
              ]}
            >
              <Image source={myMood.image} style={styles.soloMoodIcon} resizeMode="contain" />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[Typography.eyebrow, { color: moodSignal.muted }]}>
                Current signal
              </Text>
              <Text
                style={[
                  Typography.pixelHero,
                  { color: moodSignal.ink, marginTop: 4 },
                ]}
              >
                {myMood.label}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.soloMoodChevron,
              {
                backgroundColor: moodSignal.pillBg,
                borderColor: moodSignal.border,
              },
            ]}
          >
            <Icon name="chevronRight" size={18} color={moodSignal.muted} />
          </View>
        </View>
        <ArcStrip slots={arcSlots} />
      </PressScale>
    );
  };

  const aheadTitle =
    mode === 'solo' ? 'YOUR RHYTHM' : mode === 'crew' ? 'CREW RHYTHM' : 'OUR RHYTHM';
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
            PAST 15 WEEKS
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
              // Mirror the today-card: rely on shadow + bg fill for the card
              // chrome, no enclosing stroke around left/right/bottom edges so
              // the DATES/NEXT footer doesn't read as a fenced sub-rectangle.
              borderWidth: 0,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              if (!checkinsEnabled) return;
              Haptics.selectionAsync().catch(() => undefined);
              router.push('/sheets/new-checkin');
            }}
            disabled={!checkinsEnabled}
            accessibilityRole="button"
            accessibilityLabel={
              activityStreak > 0
                ? `Streak: ${activityStreak} day${activityStreak === 1 ? '' : 's'}. Tap to check in and keep it going.`
                : 'No active streak. Tap to start one.'
            }
            style={({ pressed }) => [
              styles.aheadTicketNotch,
              {
                backgroundColor: aheadTicket.notchBg,
                opacity: pressed ? 0.85 : 1,
              },
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
          </Pressable>
          <View style={styles.aheadHeroRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[Typography.pixelHeroSm, { color: aheadTicket.ink }]}
                numberOfLines={1}
              >
                <Text style={[Typography.pixelHeroSm, { color: C.accent2 }]}>
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
            <View style={styles.activityHeader}>
              <View style={styles.activityTitleRow}>
                <Icon name="activity" size={13} color={C.accent2} />
                <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                  RECENT ACTIVITY
                </Text>
              </View>
              <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                15 WEEKS
              </Text>
            </View>
            <View
              style={[
                styles.activityHeatmapFrame,
                styles.aheadSignalHeatmap,
                styles.aheadTicketHeatmap,
                { backgroundColor: aheadTicket.heatmapBg },
              ]}
            >
              <ActivityHeatmap
                weeks={15}
                days={home.activity}
                palette={aheadTicket.heatmapPalette}
                showLegend={false}
                showDayAxis={false}
                showWeekAxis={false}
                weekLabelMode="months"
                cellGap={3}
                cellRadius={1}
                maxCellSize={22}
                todayColor={C.accent2}
              />
            </View>
          </View>
          <View
            style={[
              styles.aheadFooterButtons,
              {
                backgroundColor: C.bgCard,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: aheadTicket.border,
              },
            ]}
          >
            <Pressable
              onPress={memoryDatesRoute ? () => {
                Haptics.selectionAsync().catch(() => undefined);
                router.push(memoryDatesRoute as any);
              } : undefined}
              disabled={!memoryDatesRoute}
              accessibilityRole="button"
              accessibilityLabel={`Open dates, ${home.milestones.length} saved`}
              style={({ pressed }) => [
                styles.aheadFooterButton,
                pressed ? styles.aheadFooterButtonPressed : null,
                !memoryDatesRoute ? { opacity: 0.55 } : null,
              ]}
            >
              <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                DATES
              </Text>
              <Text
                style={[Typography.captionMedium, { color: aheadTicket.ink, marginTop: 4 }]}
              >
                {home.milestones.length}
              </Text>
            </Pressable>
            <View style={[styles.aheadFooterDivider, { backgroundColor: aheadTicket.border }]} />
            <Pressable
              onPress={nextItemRoute ? () => {
                Haptics.selectionAsync().catch(() => undefined);
                router.push(nextItemRoute as any);
              } : undefined}
              disabled={!nextItemRoute}
              accessibilityRole="button"
              accessibilityLabel={`Open next item, ${nextItemTitle}`}
              style={({ pressed }) => [
                styles.aheadFooterButton,
                styles.aheadFooterButtonRight,
                pressed ? styles.aheadFooterButtonPressed : null,
                !nextItemRoute ? { opacity: 0.55 } : null,
              ]}
            >
              <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                NEXT ITEM
              </Text>
              <Text
                style={[Typography.captionMedium, { color: aheadTicket.ink, marginTop: 4 }]}
                numberOfLines={1}
              >
                {nextItemTitle}
              </Text>
            </Pressable>
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {checkinsEnabled ? (
          <View style={styles.section}>
            {mode === 'solo' ? (
              renderSoloMoodCard()
            ) : (
              <Card
                padded={false}
                elevated
                style={[
                  styles.moodCard,
                  {
                    backgroundColor: C.bgCard,
                    borderColor: C.lineColor,
                  },
                ]}
              >
                <HeroPactoBadge style={styles.heroBadge} />
                <View style={[styles.moodCardHeader, { backgroundColor: C.bgSoft }]}>
                  <View
                    style={[
                      styles.moodDatePill,
                      {
                        backgroundColor: C.bgCard,
                        borderColor: C.lineColor,
                      },
                    ]}
                  >
                    <Text style={[Typography.eyebrowSm, styles.tabularText, { color: C.ink2 }]}>
                      {dateLabel}
                    </Text>
                  </View>
                </View>
                <View style={styles.moodPair}>
                  <PressScale
                    onPress={onCheckIn}
                    style={[
                      styles.moodHalf,
                      { backgroundColor: myMood.color },
                    ]}
                  >
                    <Text style={[Typography.eyebrowSm, { color: C.peachInk }]}>
                      You
                    </Text>
                    <View style={styles.moodInline}>
                      <View style={styles.inlineMoodImageFrame}>
                        <Image source={myMood.image} style={styles.inlineMoodIcon} resizeMode="contain" />
                      </View>
                      <Text
                        style={[
                          Typography.pixelHeroSm,
                          { color: C.peachInk, marginLeft: 8 },
                        ]}
                      >
                        {myMood.label}
                      </Text>
                    </View>
                    <Text style={[Typography.small, { color: C.peachInk, marginTop: 4 }]}>
                      tap to update
                    </Text>
                  </PressScale>
                  <View
                    style={[
                      styles.moodHalf,
                      { backgroundColor: partnerMood.color },
                    ]}
                  >
                    <Text style={[Typography.eyebrowSm, { color: C.peachInk }]}>
                      {partnerFirstName ?? 'They'}
                    </Text>
                    <View style={styles.moodInline}>
                      <View style={styles.inlineMoodImageFrame}>
                        <Image source={partnerMood.image} style={styles.inlineMoodIcon} resizeMode="contain" />
                      </View>
                      <Text
                        style={[
                          Typography.pixelHeroSm,
                          { color: C.peachInk, marginLeft: 8 },
                        ]}
                      >
                        {partnerMood.label}
                      </Text>
                    </View>
                    <Text style={[Typography.small, { color: C.peachInk, marginTop: 4 }]}>
                      {partnerTodayCheckIn ? 'today' : 'no check-in today'}
                    </Text>
                  </View>
                </View>
                <ArcStrip slots={arcSlots} />
              </Card>
            )}
          </View>
        ) : null}

        {/* When you're together — live-derived summary */}
        <View style={styles.section}>
          {renderAheadCard()}
        </View>

        {/* Today — live timeline rows */}
        <View style={styles.section}>
          {renderTodayCard('band')}
        </View>

        {/* Coming up */}
        <View style={styles.section}>
          <View style={styles.comingHeadRow}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>COMING UP</Text>
            {goalsEnabled ? (
              <PressScale
                testID="home-coming-all"
                onPress={() => router.push('/(tabs)/us/plans' as any)}
                hitSlop={8}
                style={styles.comingAllBtn}
              >
                <Text style={[Typography.eyebrow, { color: C.ink3 }]}>ALL  →</Text>
              </PressScale>
            ) : null}
          </View>
          {hasComingUp ? (
            <View style={styles.comingRow}>
              {routedComingTimeline ? (() => {
                const cover = timelineCoverVisual(routedComingTimeline.type);
                const imageUri = timelineImageUri(routedComingTimeline);
                return (
                  <Card
                    padded={false}
                    elevated
                    style={styles.comingPlanCard}
                    onPress={() => {
                      const route = routeForTimelineItem(routedComingTimeline, isFeatureEnabled);
                      if (route) router.push(route as any);
                    }}
                  >
                    <View style={[styles.comingCover, { backgroundColor: cover.bg }]}>
                      {imageUri ? (
                        <Image
                          testID="home-coming-cover-image"
                          source={{ uri: imageUri }}
                          style={styles.comingCoverImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View testID="home-coming-cover-fallback" style={styles.comingCoverDefault}>
                          <Icon
                            name={cover.icon}
                            size={62}
                            color={cover.ink}
                            style={styles.comingCoverDefaultIcon}
                          />
                        </View>
                      )}
                      <View style={[styles.comingPill, { borderColor: cover.pillBorder }]}>
                        <Text style={[Typography.eyebrowSm, { color: cover.pillInk, letterSpacing: 1.4 }]}>
                          {dateLabelForTimeline(routedComingTimeline.occursAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.comingPlanMeta}>
                      <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                        {routedComingTimeline.type.toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          fontFamily: Typography.fallbackSerif,
                          fontSize: 22,
                          lineHeight: 26,
                          color: C.inkColor,
                          marginTop: 4,
                        }}
                        numberOfLines={1}
                      >
                        {routedComingTimeline.title}
                      </Text>
                      <Text style={[Typography.caption, { color: C.ink3, marginTop: 8 }]} numberOfLines={2}>
                        {routedComingTimeline.subtitle ?? timelineSourceLabel(routedComingTimeline.type)}
                      </Text>
                    </View>
                  </Card>
                );
              })() : (
                <Card padded={false} elevated style={styles.comingPlanCard}>
                  <View style={[styles.comingCover, { backgroundColor: C.bgSoft }]}>
                    <View style={[styles.comingPill, { borderColor: C.lineColor }]}>
                      <Text style={[Typography.eyebrowSm, { color: C.ink3, letterSpacing: 1.4 }]}>
                        TIMELINE
                      </Text>
                    </View>
                  </View>
                  <View style={styles.comingPlanMeta}>
                    <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>NEXT ITEM</Text>
                    <Text
                      style={{
                        fontFamily: Typography.fallbackSerif,
                        fontSize: 22,
                        lineHeight: 26,
                        color: C.inkColor,
                        marginTop: 4,
                      }}
                      numberOfLines={1}
                    >
                      Nothing scheduled
                    </Text>
                    <Text style={[Typography.caption, { color: C.ink3, marginTop: 8 }]} numberOfLines={2}>
                      Add a dated task, reminder, event, or target.
                    </Text>
                  </View>
                </Card>
              )}
              {comingMilestone ? (
                <Card
                  padded={false}
                  elevated
                  style={styles.comingAnnivCard}
                  onPress={() => router.push(routeForMilestoneItem(comingMilestone) as any)}
                >
                  <View style={styles.annivInner}>
                    <Icon name="flag" size={18} color={C.accent} />
                    <Text style={[Typography.eyebrowSm, { color: C.ink3, marginTop: 22 }]}>
                      {memoryDateTypeLabel(comingMilestone)}
                    </Text>
                    <Text style={[Typography.pixelHeroSm, { color: C.inkColor, marginTop: 4 }]} numberOfLines={2}>
                      {comingMilestone.title}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <View style={styles.annivCount}>
                      <Text style={[Typography.pixelHero, { color: C.accent }]}>
                        {comingMilestone.daysUntil}
                      </Text>
                      <Text style={[Typography.captionMedium, { color: C.ink3, marginLeft: 6, marginBottom: 6 }]}>
                        days
                      </Text>
                    </View>
                    <Text style={[Typography.caption, { color: C.ink3 }]}>
                      {comingUpLabel(comingMilestone.daysUntil)} · {dateLabelForMilestone(comingMilestone)}
                    </Text>
                  </View>
                </Card>
              ) : (
                <Card padded={false} elevated style={styles.comingAnnivCard}>
                  <View style={styles.annivInner}>
                    <Icon name="flag" size={18} color={C.ink3} />
                    <Text style={[Typography.eyebrowSm, { color: C.ink3, marginTop: 22 }]}>
                      MEMORY DATES
                    </Text>
                    <Text style={[Typography.pixelHeroSm, { color: C.inkColor, marginTop: 4 }]} numberOfLines={2}>
                      No dates yet
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[Typography.caption, { color: C.ink3 }]}>
                      Add a memory date to keep this side panel active.
                    </Text>
                  </View>
                </Card>
              )}
            </View>
          ) : (
            <Card elevated style={styles.emptyBlock}>
              <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>
                Nothing coming up yet
              </Text>
              <Text style={[Typography.caption, { color: C.ink3, marginTop: 4 }]}>
                Enable a feature or add dated items to see what is next.
              </Text>
            </Card>
          )}
        </View>

        {/* Capture dock */}
        <View style={styles.section}>
          <View style={styles.captureHeadRow}>
            <SectionHead>Capture</SectionHead>
            <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
              FAST ADD
            </Text>
          </View>
          <View style={styles.captureDock}>
            {enabledShortcuts.map((s) => (
              <PressScale
                key={s.label}
                onPress={() => router.push(s.route as any)}
                style={[
                  styles.captureAction,
                  { backgroundColor: C.bgSoft, borderColor: C.lineColor },
                ]}
              >
                <View style={[styles.captureIcon, { backgroundColor: C.accentSoft }]}>
                  <Icon name={s.icon} size={19} color={C.accent} />
                </View>
                <Text style={[Typography.captionMedium, { color: C.inkColor, marginTop: 6 }]}>
                  {s.label}
                </Text>
              </PressScale>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const SHORTCUTS: { icon: IconName; label: string; route: string; feature: FeatureId }[] = [
  { icon: 'heart', label: 'Note', route: '/sheets/new-note', feature: 'memories' },
  { icon: 'feather', label: 'Check in', route: '/sheets/new-checkin', feature: 'checkins' },
  { icon: 'checkSquare', label: 'Task', route: '/sheets/new-task', feature: 'tasks' },
  { icon: 'calendar', label: 'Calendar', route: '/(tabs)/calendar', feature: 'calendar' },
];

function useCheckInSnapshot(enabled: boolean) {
  const data = useCheckIns({ enabled });
  return {
    todayCheckIn: data.myTodayCheckIn ?? null,
    partnerTodayCheckIn: data.partnerTodayCheckIn ?? null,
    checkIns: data.checkIns,
  };
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 18,
    paddingBottom: 18,
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
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  comingCoverDefault: {
    ...StyleSheet.absoluteFillObject,
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
    ...Platform.select({
      web: { boxShadow: '0px 5px 14px rgba(0, 0, 0, 0.06)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 5 },
        shadowRadius: 14,
        elevation: 1,
      },
    }),
  },
  tabularText: {
    fontVariant: ['tabular-nums'],
  },
});
