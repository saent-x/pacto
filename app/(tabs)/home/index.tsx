import { router } from 'expo-router';
import { useMemo } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import {
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
import { useTheme } from '@/src/lib/theme';
import type { FeatureId } from '@/src/lib/features/registry';

const ARC_BUCKETS = 14;
const ARC_START_HOUR = 6;

function moodFor(key: string | null | undefined) {
  return getCheckInStateMeta(key);
}

type ArcSlot = { color: string | null; height: number };

// Bar heights tied to mood "intensity" so the arc reads as a chart, not a swatch.
// Empty slots get a short stub.
const MOOD_HEIGHT: Record<string, number> = {
  soft: 22,
  steady: 18,
  low: 13,
  rough: 30,
};

const EMPTY_HEIGHT = 8;

function heightFor(mood: string | null | undefined, jitter = 0): number {
  if (!mood) return EMPTY_HEIGHT;
  const base = MOOD_HEIGHT[mood] ?? 16;
  return Math.max(EMPTY_HEIGHT, base + jitter);
}

function buildArc(checkIns: CheckInRecord[], todayKey: string): ArcSlot[] {
  const today = checkIns
    .filter((c) => c.checkInDate === todayKey)
    .sort((a, b) => a.createdAt - b.createdAt);
  const currentHour = new Date().getHours();
  const total = Math.min(ARC_BUCKETS, Math.max(1, currentHour - ARC_START_HOUR + 1));

  if (today.length === 0) {
    return Array.from({ length: ARC_BUCKETS }, () => ({ color: null, height: EMPTY_HEIGHT }));
  }

  const slots: ArcSlot[] = [];
  let carryMood: string | null = null;
  for (let i = 0; i < total; i++) {
    const hour = ARC_START_HOUR + i;
    const before = today.filter((c) => new Date(c.createdAt).getHours() <= hour);
    const latest = before[before.length - 1];
    if (latest) carryMood = getCheckInStateMeta(latest.mood).id;
    // Slight deterministic jitter per slot so the chart reads varied even when
    // mood is constant.
    const jitter = ((i * 7) % 5) - 2;
    slots.push({
      color: carryMood ? getCheckInStateMeta(carryMood).color : null,
      height: heightFor(carryMood, jitter),
    });
  }
  while (slots.length < ARC_BUCKETS) slots.push({ color: null, height: EMPTY_HEIGHT });
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

function comingUpLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'TODAY';
  if (daysUntil === 1) return 'TOMORROW';
  return `IN ${daysUntil} DAYS`;
}

function ArcStrip({ slots }: { slots: ArcSlot[] }) {
  const { C } = useTheme();
  return (
    <View style={styles.arcStrip}>
      <View style={styles.arcHead}>
        <Text style={[Typography.eyebrowSm, { color: C.ink2 }]}>TODAY&apos;S ARC</Text>
        <Text
          style={[
            Typography.mono,
            styles.tabularText,
            { color: C.ink3, fontSize: 10, letterSpacing: 0.4 },
          ]}
        >
          6a · noon · 6p · now
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
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { partner, mode, isFeatureEnabled } = useSession();
  const home = useHomeTimeline({ previewDays: 30 });
  const { todayCheckIn, partnerTodayCheckIn, checkIns } = useCheckInSnapshot();
  const today = useMemo(() => new Date(), []);
  const dateLabel = format(today, 'EEE · MMM d').toUpperCase();
  const todayRows = useMemo(
    () => home.timeline.filter((row) => isOnLocalDate(row.occursAt, today)).slice(0, 5),
    [home.timeline, today],
  );
  const comingMilestone = home.milestones[0] ?? null;
  const checkinsEnabled = isFeatureEnabled('checkins');
  const goalsEnabled = isFeatureEnabled('goals');
  const routedTodayRows = useMemo(
    () => todayRows.filter((row) => routeForTimelineItem(row, isFeatureEnabled)),
    [todayRows, isFeatureEnabled],
  );
  const routedComingTimeline = useMemo(
    () => home.timeline.find((row) => routeForTimelineItem(row, isFeatureEnabled)) ?? null,
    [home.timeline, isFeatureEnabled],
  );
  const hasComingUp = !!routedComingTimeline || !!comingMilestone;
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
              <View style={[styles.moodWrap, styles.softShadow]}>
                <PressScale onPress={onCheckIn}>
                  <View
                    style={[
                      styles.soloMood,
                      { backgroundColor: myMood.color },
                    ]}
                  >
                    <HeroPactoBadge style={styles.heroBadge} />
                    <View style={styles.moodMetaRow}>
                      <View style={styles.moodDatePill}>
                        <Text style={[Typography.eyebrowSm, styles.tabularText, { color: '#5C4F3D' }]}>
                          {dateLabel}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.soloMoodMain}>
                      <View style={styles.soloMoodImageFrame}>
                        <Image source={myMood.image} style={styles.soloMoodIcon} resizeMode="contain" />
                      </View>
                      <View style={{ marginLeft: 14, flex: 1 }}>
                        <Text style={[Typography.eyebrow, { color: '#5C4F3D' }]}>
                          Right now you're
                        </Text>
                        <Text
                          style={[
                            Typography.pixelHero,
                            { color: '#2A241B', marginTop: 4 },
                          ]}
                        >
                          {myMood.label}
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#5C4F3D" />
                    </View>
                  </View>
                </PressScale>
                <ArcStrip slots={arcSlots} />
              </View>
            ) : (
              <Card padded={false} elevated style={styles.moodCard}>
                <HeroPactoBadge style={styles.heroBadge} />
                <View style={styles.moodCardHeader}>
                  <View style={styles.moodDatePill}>
                    <Text style={[Typography.eyebrowSm, styles.tabularText, { color: '#5C4F3D' }]}>
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
                    <Text style={[Typography.eyebrowSm, { color: '#5C4F3D' }]}>
                      You
                    </Text>
                    <View style={styles.moodInline}>
                      <View style={styles.inlineMoodImageFrame}>
                        <Image source={myMood.image} style={styles.inlineMoodIcon} resizeMode="contain" />
                      </View>
                      <Text
                        style={[
                          Typography.pixelHeroSm,
                          { color: '#2A241B', marginLeft: 8 },
                        ]}
                      >
                        {myMood.label}
                      </Text>
                    </View>
                    <Text style={[Typography.small, { color: '#5C4F3D', marginTop: 4 }]}>
                      tap to update
                    </Text>
                  </PressScale>
                  <View
                    style={[
                      styles.moodHalf,
                      { backgroundColor: partnerMood.color },
                    ]}
                  >
                    <Text style={[Typography.eyebrowSm, { color: '#5C4F3D' }]}>
                      {partnerFirstName ?? 'They'}
                    </Text>
                    <View style={styles.moodInline}>
                      <View style={styles.inlineMoodImageFrame}>
                        <Image source={partnerMood.image} style={styles.inlineMoodIcon} resizeMode="contain" />
                      </View>
                      <Text
                        style={[
                          Typography.pixelHeroSm,
                          { color: '#2A241B', marginLeft: 8 },
                        ]}
                      >
                        {partnerMood.label}
                      </Text>
                    </View>
                    <Text style={[Typography.small, { color: '#5C4F3D', marginTop: 4 }]}>
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
          <View style={styles.togetherHeadRow}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>
              {mode === 'solo' ? "WHAT'S AHEAD" : "WHEN YOU'RE TOGETHER"}
            </Text>
            <Text
              style={[Typography.eyebrow, styles.tabularText, { color: C.ink3 }]}
            >
              NEXT 30 DAYS
            </Text>
          </View>
          <Card elevated style={{ padding: 18 }}>
            <Text
              style={[Typography.pixelHeroSm, { color: C.inkColor }]}
              numberOfLines={1}
            >
              <Text style={[Typography.pixelHeroSm, { color: C.accent }]}>
                {home.timeline.length + home.milestones.length}
              </Text>
              {' LIVE ITEMS'}
            </Text>
            <View style={[styles.togetherFooter, { borderTopColor: C.lineColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                  NEXT
                </Text>
                <Text
                  style={[Typography.captionMedium, { color: C.inkColor, marginTop: 4 }]}
                >
                  {routedComingTimeline ? routedComingTimeline.title : comingMilestone ? comingMilestone.title : 'Nothing scheduled yet'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                  MILESTONES
                </Text>
                <Text
                  style={[Typography.captionMedium, { color: C.inkColor, marginTop: 4 }]}
                >
                  {home.milestones.length}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Today — live timeline rows */}
        <View style={styles.section}>
          <View style={styles.todayHeadRow}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>TODAY</Text>
            <Text style={[Typography.eyebrow, styles.tabularText, { color: C.ink3 }]}>
              {format(today, 'MMM d').toUpperCase()}
            </Text>
          </View>
          <Card padded={false} elevated style={styles.todayCard}>
            {routedTodayRows.length === 0 ? (
              goalsEnabled ? (
                <PressScale
                  testID="home-timeline-empty"
                  onPress={() => router.push('/sheets/new-plan' as any)}
                  style={styles.emptyBlock}
                >
                  <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>
                    Nothing scheduled yet
                  </Text>
                  <Text style={[Typography.captionMedium, { color: C.accent, marginTop: 4 }]}>
                    Add a plan
                  </Text>
                </PressScale>
              ) : (
                <View testID="home-timeline-empty" style={styles.emptyBlock}>
                  <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>
                    Nothing scheduled yet
                  </Text>
                  <Text style={[Typography.caption, { color: C.ink3, marginTop: 4 }]}>
                    Add a task or calendar item when there is something real to track.
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
              {routedComingTimeline ? (
                <Card
                  padded={false}
                  elevated
                  style={styles.comingPlanCard}
                  onPress={() => {
                    const route = routeForTimelineItem(routedComingTimeline, isFeatureEnabled);
                    if (route) router.push(route as any);
                  }}
                >
                  <View style={[styles.comingCover, { backgroundColor: '#CFE8D9' }]}>
                    <View style={[styles.comingPill, { borderColor: '#7FB89B' }]}>
                      <Text style={[Typography.eyebrowSm, { color: '#3F7A5C', letterSpacing: 1.4 }]}>
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
                      {routedComingTimeline.subtitle ?? 'From your live timeline'}
                    </Text>
                  </View>
                </Card>
              ) : null}
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
                      {comingMilestone.type.toUpperCase()}
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
              ) : null}
            </View>
          ) : (
            <Card elevated style={styles.emptyBlock}>
              <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>
                Nothing coming up yet
              </Text>
              <Text style={[Typography.caption, { color: C.ink3, marginTop: 4 }]}>
                Add a plan or milestone when there is something real to track.
              </Text>
            </Card>
          )}
        </View>

        {/* Shortcuts */}
        <View style={styles.section}>
          <SectionHead>Shortcuts</SectionHead>
          <View style={styles.shortcuts}>
            {enabledShortcuts.map((s) => (
              <PressScale
                key={s.label}
                onPress={() => router.push(s.route as any)}
                style={[
                  styles.shortcut,
                  { backgroundColor: C.bgSoft, borderColor: C.lineColor },
                ]}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: C.accentSoft }]}>
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

function useCheckInSnapshot() {
  const data = useCheckIns();
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
  togetherFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 14,
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
    borderRadius: 18,
  },
  emptyBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  todayDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  todayRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  },
  comingPill: {
    alignSelf: 'flex-start',
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
  shortcuts: {
    flexDirection: 'row',
    gap: 8,
  },
  shortcut: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 66,
    justifyContent: 'center',
  },
  shortcutIcon: {
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
