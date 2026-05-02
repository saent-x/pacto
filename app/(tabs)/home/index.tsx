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
import { useSession } from '@/src/hooks/useSession';
import { getCheckInStateMeta } from '@/src/constants/checkInStates';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

const ARC_BUCKETS = 14;
const ARC_START_HOUR = 6;

function moodFor(key: string | null | undefined) {
  return getCheckInStateMeta(key);
}

type ArcSlot = { color: string | null; height: number };

// Bar heights tied to mood "intensity" so the arc reads as a chart, not a swatch
// row. Empty slots get a short stub. Tweaked per-slot in the mock so bars sit
// at varied levels even when the mood id repeats.
const MOOD_HEIGHT: Record<string, number> = {
  soft: 22,
  steady: 18,
  low: 13,
  rough: 30,
};

const ARC_MOCK: { mood: 'soft' | 'low' | 'steady' | 'rough'; jitter?: number }[] = [
  { mood: 'soft',   jitter: -2 },
  { mood: 'soft',   jitter: 2  },
  { mood: 'low',    jitter: 1  },
  { mood: 'low',    jitter: -1 },
  { mood: 'soft',   jitter: 3  },
  { mood: 'steady', jitter: -2 },
  { mood: 'steady', jitter: 1  },
  { mood: 'rough',  jitter: -3 },
  { mood: 'rough',  jitter: 2  },
  { mood: 'steady', jitter: -1 },
  { mood: 'steady', jitter: 2  },
  { mood: 'soft',   jitter: -3 },
  { mood: 'soft',   jitter: 1  },
  { mood: 'soft',   jitter: -1 },
];

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

  // No data yet — return mock pattern truncated to "now".
  if (today.length === 0) {
    const slots: ArcSlot[] = ARC_MOCK.slice(0, total).map((m) => ({
      color: getCheckInStateMeta(m.mood).color,
      height: heightFor(m.mood, m.jitter ?? 0),
    }));
    while (slots.length < ARC_BUCKETS) slots.push({ color: null, height: EMPTY_HEIGHT });
    return slots;
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
  const { user, partner, mode } = useSession();
  const { todayCheckIn, partnerTodayCheckIn, checkIns } = useCheckInSnapshot();
  const today = useMemo(() => new Date(), []);
  const dateLabel = format(today, 'EEE · MMM d').toUpperCase();

  const partnerFirstName = partner?.displayName?.split(' ')[0] ?? null;

  const myMood = moodFor(todayCheckIn?.mood);
  const partnerMood = moodFor(partnerTodayCheckIn?.mood);

  const todayKey = getLocalDateKey();
  const arcSlots = useMemo(() => buildArc(checkIns, todayKey), [checkIns, todayKey]);

  // Together heatmap — 7 days × 4 time slots. Deterministic seeded values
  // until real co-presence data wires up.
  const togetherData = useMemo(() => {
    const seed = user?.id ? hashSeed(user.id + 'together') : 11;
    const rand = mulberry32(seed);
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const slotLabels = ['morn', 'noon', 'eve', 'night'];
    // Bias evenings & weekends higher so the chart reads like a real rhythm.
    const slotBias = [0.15, 0.35, 0.7, 0.55];
    const dayBias = [0.45, 0.45, 0.4, 0.5, 0.55, 0.75, 0.7];
    const grid: number[][] = slotLabels.map((_, si) =>
      dayLabels.map((_, di) => {
        const noise = rand() * 0.4 - 0.2;
        const v = Math.min(1, Math.max(0.05, slotBias[si] * 0.6 + dayBias[di] * 0.5 + noise));
        return v;
      }),
    );
    let peak = { si: 0, di: 0, v: -1 };
    let quiet = { si: 0, di: 0, v: 2 };
    for (let si = 0; si < grid.length; si++) {
      for (let di = 0; di < grid[si].length; di++) {
        const v = grid[si][di];
        if (v > peak.v) peak = { si, di, v };
        if (v < quiet.v) quiet = { si, di, v };
      }
    }
    const slotAvg = slotLabels.map((_, si) =>
      grid[si].reduce((a, b) => a + b, 0) / grid[si].length,
    );
    const winnerSlot = slotAvg.indexOf(Math.max(...slotAvg));
    const slotLong = ['Mornings', 'Noons', 'Evenings', 'Nights'];
    const dayLong = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const slotShort = ['morning', 'noon', 'evening', 'night'];
    return {
      dayLabels,
      slotLabels,
      grid,
      title: slotLong[winnerSlot],
      peakLabel: `${dayLong[peak.di]} ${slotShort[peak.si]}`,
      quietLabel: `${dayLong[quiet.di]} ${slotShort[quiet.si]}`,
    };
  }, [user?.id]);

  const togetherTier = (v: number) => {
    if (v < 0.2) return '#F5DDD3';
    if (v < 0.4) return '#EFC3B5';
    if (v < 0.6) return '#E0A795';
    if (v < 0.8) return '#D08D75';
    return '#C7755A';
  };

  const onCheckIn = () => router.push('/sheets/new-checkin');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood / check-in section */}
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

        {/* When you're together — 7×4 co-presence heatmap */}
        <View style={styles.section}>
          <View style={styles.togetherHeadRow}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>
              {mode === 'solo' ? "WHEN YOU'RE FREE" : "WHEN YOU'RE TOGETHER"}
            </Text>
            <Text
              style={[Typography.eyebrow, styles.tabularText, { color: C.ink3 }]}
            >
              THIS WEEK
            </Text>
          </View>
          <Card elevated style={{ padding: 18 }}>
            <Text
              style={[Typography.pixelHeroSm, { color: C.inkColor }]}
              numberOfLines={1}
            >
              <Text style={[Typography.pixelHeroSm, { color: C.accent }]}>
                {togetherData.title.toUpperCase()}
              </Text>
              {' ARE YOURS'}
            </Text>

            {/* Day labels */}
            <View style={styles.togetherDayRow}>
              <View style={styles.togetherSlotLabelGutter} />
              {togetherData.dayLabels.map((d, i) => (
                <View key={i} style={styles.togetherCellSlot}>
                  <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 10 }]}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Rows */}
            {togetherData.slotLabels.map((slot, si) => (
              <View key={slot} style={styles.togetherRow}>
                <View style={styles.togetherSlotLabelGutter}>
                  <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 10 }]}>
                    {slot.toUpperCase()}
                  </Text>
                </View>
                {togetherData.grid[si].map((v, di) => (
                  <View key={di} style={styles.togetherCellSlot}>
                    <View
                      style={[
                        styles.togetherCell,
                        { backgroundColor: togetherTier(v) },
                      ]}
                    />
                  </View>
                ))}
              </View>
            ))}

            {/* Footer */}
            <View style={[styles.togetherFooter, { borderTopColor: C.lineColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                  PEAK
                </Text>
                <Text
                  style={[Typography.captionMedium, { color: C.inkColor, marginTop: 4 }]}
                >
                  {togetherData.peakLabel}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                  QUIETEST
                </Text>
                <Text
                  style={[Typography.captionMedium, { color: C.inkColor, marginTop: 4 }]}
                >
                  {togetherData.quietLabel}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Today — weather banner + timeline rows */}
        <View style={styles.section}>
          <View style={styles.todayHeadRow}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>TODAY</Text>
            <Text style={[Typography.eyebrow, styles.tabularText, { color: C.ink3 }]}>
              {format(today, 'MMM d').toUpperCase()}
            </Text>
          </View>
          <Card padded={false} elevated style={styles.todayCard}>
            <View style={[styles.weatherBanner, { backgroundColor: '#DCE7EE' }]}>
              <Icon name="cloud" size={22} color="#2A3A48" strokeWidth={1.6} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[Typography.bodyMedium, { color: '#1F2A33' }]}>Cloudy, mild</Text>
                <Text style={[Typography.mono, { color: '#5A6B78', fontSize: 11, marginTop: 2 }]}>
                  Brooklyn · feels 60°
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    Typography.pixelHeroSm,
                    styles.tabularText,
                    { color: '#1F2A33' },
                  ]}
                >
                  62°
                </Text>
                <Text style={[Typography.mono, { color: '#5A6B78', fontSize: 11, marginTop: 2 }]}>
                  ↑68  ↓54
                </Text>
              </View>
            </View>
            {TODAY_ROWS.map((row, i) => (
              <View key={row.title}>
                {i > 0 ? <View style={[styles.todayDivider, { backgroundColor: C.lineColor }]} /> : null}
                <PressScale onPress={() => router.push(row.route as any)} style={styles.todayRow2}>
                  <Text style={[Typography.mono, styles.tabularText, styles.todayTime, { color: C.ink3 }]}>
                    {row.time}
                  </Text>
                  <View style={[styles.todayDot, { backgroundColor: row.dot }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyMedium, { color: C.inkColor }]} numberOfLines={1}>
                      {row.title}
                    </Text>
                    <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]} numberOfLines={1}>
                      {row.subtitle}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={16} color={C.ink3} />
                </PressScale>
              </View>
            ))}
          </Card>
        </View>

        {/* Coming up */}
        <View style={styles.section}>
          <View style={styles.comingHeadRow}>
            <Text style={[Typography.eyebrow, { color: C.ink3 }]}>COMING UP</Text>
            <PressScale
              onPress={() => router.push('/(tabs)/us/plans' as any)}
              hitSlop={8}
              style={styles.comingAllBtn}
            >
              <Text style={[Typography.eyebrow, { color: C.ink3 }]}>ALL  →</Text>
            </PressScale>
          </View>
          <View style={styles.comingRow}>
            {/* Plan card */}
            <Card
              padded={false}
              elevated
              style={styles.comingPlanCard}
              onPress={() => router.push('/(tabs)/us/plans' as any)}
            >
              <View style={[styles.comingCover, { backgroundColor: '#CFE8D9' }]}>
                <View style={[styles.comingPill, { borderColor: '#7FB89B' }]}>
                  <Text
                    style={[
                      Typography.eyebrowSm,
                      { color: '#3F7A5C', letterSpacing: 1.4 },
                    ]}
                  >
                    IN 2 DAYS
                  </Text>
                </View>
              </View>
              <View style={styles.comingPlanMeta}>
                <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                  SUN · APR 27
                </Text>
                <Text
                  style={[
                    {
                      fontFamily: Typography.fallbackSerif,
                      fontSize: 22,
                      lineHeight: 26,
                      color: C.inkColor,
                      marginTop: 4,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Picnic at Buttermilk
                </Text>
                <View style={styles.comingAttendees}>
                  <View style={[styles.miniAvatar, { backgroundColor: C.accent, marginRight: -8 }]}>
                    <Text style={styles.miniAvatarTxt}>M</Text>
                  </View>
                  <View style={[styles.miniAvatar, { backgroundColor: C.accent2 }]}>
                    <Text style={styles.miniAvatarTxt}>J</Text>
                  </View>
                  <Text style={[Typography.caption, { color: C.ink3, marginLeft: 8 }]}>
                    both going
                  </Text>
                </View>
              </View>
            </Card>
            {/* Anniversary card */}
            <Card padded={false} elevated style={styles.comingAnnivCard}>
              <View style={styles.annivInner}>
                <Icon name="flag" size={18} color={C.accent} />
                <Text style={[Typography.eyebrowSm, { color: C.ink3, marginTop: 22 }]}>
                  ANNIVERSARY
                </Text>
                <Text
                  style={[
                    Typography.pixelHeroSm,
                    { color: C.inkColor, marginTop: 4 },
                  ]}
                >
                  4 years
                </Text>
                <View style={{ flex: 1 }} />
                <View style={styles.annivCount}>
                  <Text
                    style={[
                      Typography.pixelHero,
                      { color: C.accent },
                    ]}
                  >
                    22
                  </Text>
                  <Text
                    style={[
                      Typography.captionMedium,
                      {
                        color: C.ink3,
                        marginLeft: 6,
                        marginBottom: 6,
                      },
                    ]}
                  >
                    days
                  </Text>
                </View>
                <View style={[styles.annivProgressTrack, { backgroundColor: C.bgSoft }]}>
                  <View style={[styles.annivProgressFill, { backgroundColor: C.accent, width: '40%' }]} />
                </View>
              </View>
            </Card>
          </View>
        </View>

        {/* Shortcuts */}
        <View style={styles.section}>
          <SectionHead>Shortcuts</SectionHead>
          <View style={styles.shortcuts}>
            {SHORTCUTS.map((s) => (
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

const TODAY_ROWS: {
  time: string;
  dot: string;
  title: string;
  subtitle: string;
  route: string;
}[] = [
  {
    time: '6:00p',
    dot: '#C7755A',
    title: 'Pay electricity bill',
    subtitle: 'monthly · auto-recurring',
    route: '/(tabs)/reminders',
  },
  {
    time: '7:00p',
    dot: '#C8AE73',
    title: 'Sheet-pan salmon',
    subtitle: 'Maya cooks · Jordan plates',
    route: '/(tabs)/tasks',
  },
  {
    time: '7:30p',
    dot: '#6FB3A2',
    title: 'Yoga class',
    subtitle: '45 min · Maya',
    route: '/(tabs)/calendar',
  },
];

const SHORTCUTS: { icon: IconName; label: string; route: string }[] = [
  { icon: 'heart', label: 'Note', route: '/sheets/new-note' },
  { icon: 'feather', label: 'Check in', route: '/sheets/new-checkin' },
  { icon: 'checkSquare', label: 'Task', route: '/sheets/new-task' },
  { icon: 'calendar', label: 'Calendar', route: '/(tabs)/calendar' },
];

function useCheckInSnapshot() {
  const data = useCheckIns();
  return {
    todayCheckIn: data.myTodayCheckIn ?? null,
    partnerTodayCheckIn: data.partnerTodayCheckIn ?? null,
    checkIns: data.checkIns,
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 1000 + 1;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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
  weatherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
