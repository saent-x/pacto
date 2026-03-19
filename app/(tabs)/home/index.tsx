import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/src/hooks/useColors';
import { useMood as useMoodHook } from '@/src/hooks/useMood';
import { useReminders } from '@/src/hooks/useReminders';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { useCoupleStore } from '@/src/stores/coupleStore';
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isSameDay,
} from 'date-fns';
import { useState, useMemo, useRef } from 'react';
import { getDailyVerse } from '@/src/constants/verses';

const { width: SCREEN_W } = Dimensions.get('window');

function WeekStrip({ selectedDate, onSelect, colors: C }: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <View style={styles.weekStrip}>
      <View style={styles.weekHeader}>
        <Text style={[styles.weekMonth, { color: C.text }]}>
          {format(new Date(), 'MMMM yyyy')}
        </Text>
        <TouchableOpacity
          onPress={() => onSelect(new Date())}
          style={[styles.todayBtn, { backgroundColor: C.primaryMuted }]}
        >
          <Text style={[styles.todayBtnText, { color: C.primary }]}>Today</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekDays}>
        {days.map((day) => {
          const today = isToday(day);
          const selected = isSameDay(day, selectedDate);
          return (
            <TouchableOpacity
              key={day.toISOString()}
              onPress={() => onSelect(day)}
              style={[
                styles.dayCell,
                selected && { backgroundColor: C.primary },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayName,
                { color: selected ? C.ink : C.textTertiary },
              ]}>
                {format(day, 'EEE')}
              </Text>
              <Text style={[
                styles.dayNum,
                { color: selected ? C.ink : C.text },
                today && !selected && { color: C.primary },
              ]}>
                {format(day, 'd')}
              </Text>
              {today && !selected && (
                <View style={[styles.todayDot, { backgroundColor: C.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const MOODS = [
  { level: 1, label: 'Great', icon: 'sun' as const, color: '#8AAF7B' },
  { level: 2, label: 'Good', icon: 'cloud' as const, color: '#7BA0AF' },
  { level: 3, label: 'Okay', icon: 'minus' as const, color: '#D4A054' },
  { level: 4, label: 'Low', icon: 'cloud-drizzle' as const, color: '#B08090' },
  { level: 5, label: 'Rough', icon: 'cloud-lightning' as const, color: '#C96B5A' },
];

function HeaderMood({ colors: C }: {
  colors: ReturnType<typeof useColors>;
}) {
  const { myMood, partnerMood, checkIn } = useMoodHook();

  const selected = myMood?.mood ?? null;

  const handleSelect = (level: number, icon: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    checkIn(level, icon);
  };

  if (selected !== null) {
    const mood = MOODS.find((m) => m.level === selected);
    if (!mood) return null;
    return (
      <View style={styles.headerMood}>
        <View style={[styles.headerMoodPill, { backgroundColor: mood.color + '15' }]}>
          <Feather name={mood.icon} size={13} color={mood.color} />
          <Text style={[styles.headerMoodText, { color: mood.color }]}>
            {mood.label}
          </Text>
        </View>
        {partnerMood && (
          <View style={[styles.headerMoodPill, { backgroundColor: C.dim }]}>
            <Text style={[styles.headerMoodText, { color: C.textTertiary }]}>
              Partner: {MOODS.find((m) => m.level === partnerMood.mood)?.label ?? ''}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.headerMood}>
      <Text style={[styles.headerMoodAsk, { color: C.textTertiary }]}>How are you?</Text>
      <View style={styles.headerMoodIcons}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.level}
            onPress={() => handleSelect(mood.level, mood.icon)}
            activeOpacity={0.7}
            style={[styles.headerMoodIcon, { backgroundColor: mood.color + '12' }]}
          >
            <Feather name={mood.icon} size={14} color={mood.color} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const C = useColors();
  const profile = useAuthStore((s) => s.profile);
  const couple = useCoupleStore((s) => s.couple);
  const partner = useCoupleStore((s) => s.partner);
  const { upcoming: allReminders } = useReminders();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [nameWidth, setNameWidth] = useState(0);
  const nameWidthRef = useRef(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.display_name?.split(' ')[0] || 'there';
  const selectedLabel = isToday(selectedDate)
    ? 'Today'
    : format(selectedDate, 'EEEE, MMM d');
  const verse = useMemo(() => getDailyVerse(), []);

  // Items for selected day
  const dayReminders = useMemo(() => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    return allReminders.filter((r) => r.due_at.startsWith(dayStr));
  }, [allReminders, selectedDate]);

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>

        {/* Static header — doesn't scroll */}
        <View style={[styles.hero, { backgroundColor: C.surface }]}>
          <View pointerEvents="none" style={styles.ringsWrap}>
            <View style={[styles.ring, styles.ringLeft, { borderColor: C.primary }]} />
            <View style={[styles.ring, styles.ringRight, { borderColor: C.primary }]} />
          </View>

          <Animated.View entering={FadeInDown.duration(600)} style={styles.heroTop}>
            <View>
              <Text style={[styles.greeting, { color: C.textTertiary }]}>{greeting}</Text>
              <View style={styles.nameWrap}>
                <Text
                  style={[styles.heroName, { color: C.text }]}
                  onLayout={(e) => {
                    if (!nameWidthRef.current) {
                      nameWidthRef.current = true;
                      setNameWidth(e.nativeEvent.layout.width);
                    }
                  }}
                >
                  {firstName}
                </Text>
                {nameWidth > 0 && (
                  <Svg width={nameWidth} height={12} viewBox="0 0 100 12" preserveAspectRatio="none" style={styles.nameCurve}>
                    <Path
                      d="M2 8 C25 3, 45 2, 55 5 S80 10, 98 4"
                      stroke="#C8930F"
                      strokeWidth={4}
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.75}
                    />
                  </Svg>
                )}
              </View>
            </View>
            {couple && (
              <View style={styles.coupleChip}>
                <View style={styles.coupleAvatars}>
                  <View style={[styles.miniAvatar, { backgroundColor: C.primaryMuted, borderColor: C.primary }]}>
                    <Text style={[styles.miniLetter, { color: C.primary }]}>
                      {(profile?.display_name?.[0] || 'Y').toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.miniAvatar, styles.miniOverlap, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Text style={[styles.miniLetter, { color: C.textSecondary }]}>
                      {(partner?.display_name?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.coupleLabel, { color: C.textSecondary }]}>{couple.name}</Text>
              </View>
            )}
          </Animated.View>

          {/* Mood — compact, in header */}
          <HeaderMood colors={C} />

          <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} colors={C} />
        </View>

        {/* Scrollable content */}
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.body}>
            {/* Daily verse */}
            <Animated.View entering={FadeInDown.duration(700).delay(200)} style={styles.verse}>
              <View style={[styles.verseLine, { backgroundColor: C.primary }]} />
              <View style={styles.verseContent}>
                <Text style={[styles.verseText, { color: C.text }]}>
                  {verse.text}
                </Text>
                <Text style={[styles.verseRef, { color: C.primary }]}>
                  {verse.ref}
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(400)}>
              <Text style={[styles.dayTitle, { color: C.text }]}>{selectedLabel}</Text>
            </Animated.View>

            {/* Day timeline */}
            {dayReminders.length === 0 ? (
              <Animated.View entering={FadeInDown.duration(500).delay(400)}>
                <View style={[styles.emptyDay, { borderColor: C.border }]}>
                  <View style={[styles.timelineLine, { backgroundColor: C.border }]} />
                  <View style={[styles.timelineDot, { backgroundColor: C.primary }]} />
                  <View style={styles.emptyContent}>
                    <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>Your day is clear</Text>
                    <Text style={[styles.emptyDesc, { color: C.textTertiary }]}>
                      Reminders and tasks for this day will show up here.
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(500).delay(400)}>
                {dayReminders.map((r, i) => (
                  <View key={r.id} style={[styles.timelineItem, { borderColor: C.border }]}>
                    <View style={[styles.timelineLine, { backgroundColor: C.border }]} />
                    <View style={[styles.timelineDot, { backgroundColor: r.is_completed ? C.success : C.reminders }]} />
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTime, { color: C.textTertiary }]}>
                        {format(new Date(r.due_at), 'h:mm a')}
                      </Text>
                      <Text
                        style={[
                          styles.timelineTitle,
                          { color: r.is_completed ? C.textTertiary : C.text },
                          r.is_completed && styles.strikethrough,
                        ]}
                        numberOfLines={1}
                      >
                        {r.title}
                      </Text>
                    </View>
                    <View style={[styles.timelineBadge, { backgroundColor: C.remindersLight }]}>
                      <Feather name="bell" size={10} color={C.reminders} />
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Explore together — badge pills */}
            <Animated.View entering={FadeInDown.duration(500).delay(650)} style={styles.explore}>
              <Text style={[styles.exploreLabel, { color: C.textTertiary }]}>Explore together</Text>
              <View style={styles.exploreBadges}>
                {([
                  { icon: 'star' as const, label: 'Wishlists', color: C.wishlists, bg: C.wishlistsLight },
                  { icon: 'compass' as const, label: 'Plans', color: C.plans, bg: C.plansLight },
                  { icon: 'clipboard' as const, label: 'Checklists', color: C.checklists, bg: C.checklistsLight },
                  { icon: 'credit-card' as const, label: 'Expenses', color: C.expenses, bg: C.expensesLight },
                  { icon: 'flag' as const, label: 'Milestones', color: C.milestones, bg: C.milestonesLight },
                ]).map((t) => (
                  <TouchableOpacity
                    key={t.label}
                    activeOpacity={0.7}
                    style={[styles.exploreBadge, { backgroundColor: t.bg }]}
                  >
                    <Feather name={t.icon} size={13} color={t.color} />
                    <Text style={[styles.exploreBadgeText, { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: Spacing['4xl'] },

  // Hero
  hero: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    overflow: 'hidden',
  },
  ringsWrap: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 160,
    height: 160,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    opacity: 0.07,
  },
  ringLeft: {
    top: 10,
    left: 0,
  },
  ringRight: {
    top: 10,
    left: 40,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing['2xl'],
  },
  greeting: { ...Typography.overline, marginBottom: Spacing.xs },
  nameWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  heroName: { ...Typography.display, fontSize: 36, lineHeight: 40 },
  nameCurve: {
    marginTop: -4,
    marginLeft: 2,
  },

  // Couple chip
  coupleChip: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  coupleAvatars: { flexDirection: 'row' },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniOverlap: { marginLeft: -10 },
  miniLetter: { fontSize: 13, fontWeight: '600' },
  coupleLabel: { ...Typography.small },

  // Week strip
  weekStrip: {},
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  weekMonth: { ...Typography.subheading },
  todayBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  todayBtnText: { ...Typography.small, fontWeight: '600' },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    width: (SCREEN_W - 48) / 7,
    position: 'relative',
  },
  dayName: { ...Typography.small, fontSize: 10, marginBottom: 4 },
  dayNum: { fontSize: 16, fontWeight: '600' },
  todayDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Shared
  sectionLabel: {
    ...Typography.overline,
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },

  // Body
  body: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
  },

  // Daily verse
  verse: {
    flexDirection: 'row',
    marginBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  verseLine: {
    width: 2,
    borderRadius: 1,
  },
  verseContent: {
    flex: 1,
  },
  verseText: {
    ...Typography.body,
    fontFamily: Typography.heading.fontFamily,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  verseRef: {
    ...Typography.small,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  dayTitle: {
    ...Typography.heading,
    marginBottom: Spacing.xl,
  },

  // Empty day — timeline style
  emptyDay: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    paddingLeft: Spacing.xl,
    marginBottom: Spacing['2xl'],
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 0,
    bottom: 0,
    width: 1,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: Spacing.lg,
    marginTop: 3,
  },
  emptyContent: {
    flex: 1,
  },
  emptyTitle: { ...Typography.body, marginBottom: Spacing.xs },
  emptyDesc: { ...Typography.caption },

  // Timeline items (when day has reminders)
  timelineItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.xl,
    position: 'relative',
    alignItems: 'center',
  },
  timelineContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  timelineTime: {
    ...Typography.small,
    fontSize: 11,
    marginBottom: 1,
  },
  timelineTitle: {
    ...Typography.body,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  timelineBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },

  // Header mood
  headerMood: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  headerMoodAsk: {
    ...Typography.small,
  },
  headerMoodIcons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerMoodIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  headerMoodText: {
    ...Typography.small,
    fontWeight: '500',
  },
  headerMoodChange: {
    ...Typography.small,
  },

  // Explore — badge pills
  explore: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: Spacing['2xl'],
  },
  exploreLabel: {
    ...Typography.small,
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  exploreBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  exploreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  exploreBadgeText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },
});
