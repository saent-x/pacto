import * as Haptics from 'expo-haptics';
import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useCalendar } from '@/src/lib/calendar/context';
import type { HeroStats, TomorrowCard, WeekDay } from '@/src/lib/calendar/builders';
import {
  formatAgendaDayHeader,
  formatAgendaTime,
} from '@/src/lib/calendar/builders';
import type { TimelineItem } from '@/src/lib/home/types';
import { useTheme } from '@/src/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function Calendar() {
  const { C, F } = useTheme();
  const cal = useCalendar();
  const { week, agenda, heroStats, tomorrow, selectedDate, isLoading, selectDate } = cal;

  if (isLoading && agenda.length === 0 && week.every((d) => !d.hasEvent)) {
    return <CalendarSkeleton />;
  }

  return (
    <Screen>
      <HeroCard stats={heroStats} />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          marginBottom: 8,
        }}
      >
        {DAY_LABELS.map((d) => (
          <Text
            key={d}
            style={{
              fontSize: 10,
              color: C.fog,
              fontFamily: F.bodyBold,
              letterSpacing: 1.2,
              width: 40,
              textAlign: 'center',
            }}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }}>
        {week.map((day) => (
          <DayPill
            key={day.date}
            day={day}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              selectDate(day.date);
            }}
          />
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text
          testID="calendar-day-header"
          style={{ fontSize: 11, color: C.fog, fontFamily: F.bodyBold, letterSpacing: 1.4 }}
        >
          {formatAgendaDayHeader(selectedDate)}
        </Text>
        <Text style={{ fontSize: 11, color: C.gold, fontFamily: F.bodyBold }}>
          {agenda.length} {agenda.length === 1 ? 'event' : 'events'}
        </Text>
      </View>

      {agenda.length === 0 ? (
        <EmptyAgenda />
      ) : (
        agenda.map((item) => <AgendaRow key={item.id} item={item} />)
      )}

      {tomorrow && (
        <>
          <Text
            style={{
              fontSize: 11,
              color: C.fog,
              fontFamily: F.bodyBold,
              letterSpacing: 1.4,
              paddingHorizontal: 4,
              marginTop: 18,
              marginBottom: 10,
            }}
          >
            TOMORROW
          </Text>
          <TomorrowRow card={tomorrow} />
        </>
      )}
    </Screen>
  );
}

function HeroCard({ stats }: { stats: HeroStats }) {
  const { C, F } = useTheme();
  const { total, shared, upcoming, nextInHours } = stats;

  const subtitle =
    total === 0
      ? 'nothing booked · add via +'
      : `${shared} shared · ${upcoming} upcoming${
          nextInHours !== null ? ` · next in ${nextInHours}h` : ''
        }`;

  return (
    <View
      testID="calendar-hero"
      style={{ backgroundColor: C.butter, borderRadius: 26, padding: 22, marginBottom: 22 }}
    >
      <Text
        style={{
          fontSize: 10,
          color: C.butterInk,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          opacity: 0.6,
          marginBottom: 8,
        }}
      >
        THIS MONTH
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
        <Text
          testID="calendar-hero-count"
          style={{
            fontFamily: F.displayBold,
            fontSize: 60,
            color: C.butterInk,
            lineHeight: 56,
            letterSpacing: -2,
          }}
        >
          {total}
        </Text>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 22,
            color: C.butterInk,
            lineHeight: 22,
            marginBottom: 6,
          }}
        >
          {total === 1 ? 'event' : 'events'}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 11,
          color: C.butterInk,
          fontFamily: F.bodyBold,
          opacity: 0.75,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

const DayPill = memo(function DayPill({
  day,
  onPress,
}: {
  day: WeekDay;
  onPress: () => void;
}) {
  const { C, F } = useTheme();
  const scale = useSharedValue(1);
  const fill = useSharedValue(day.isSelected ? 1 : 0);

  React.useEffect(() => {
    fill.value = withTiming(day.isSelected ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [day.isSelected, fill]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: 1 - fill.value }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      testID={`calendar-day-${day.date}`}
      accessibilityRole="button"
      accessibilityState={{ selected: day.isSelected }}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(1.04, { damping: 18, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 260 });
      }}
      style={[
        scaleStyle,
        {
          width: 40,
          height: 54,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          fillStyle,
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: 14,
            backgroundColor: C.gold,
          },
        ]}
      />
      <Text
        style={{
          fontFamily: F.displayBold,
          fontSize: 18,
          color: day.isSelected ? C.peachInk : C.bone,
        }}
      >
        {day.dayNum}
      </Text>
      {day.hasEvent && (
        <Animated.View
          pointerEvents="none"
          style={[
            dotStyle,
            {
              position: 'absolute',
              bottom: 8,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: C.gold,
            },
          ]}
        />
      )}
    </AnimatedPressable>
  );
});

type PastelKey = 'peach' | 'sky' | 'lavender' | 'mint' | 'rose' | 'butter';

const AGENDA_COLORS: Record<TimelineItem['type'], { bg: PastelKey; ink: string }> = {
  event: { bg: 'peach', ink: '#1A0F0A' },
  plan: { bg: 'sky', ink: '#0E2230' },
  reminder: { bg: 'lavender', ink: '#1F1635' },
  task: { bg: 'mint', ink: '#0F2C1A' },
  ritual: { bg: 'rose', ink: '#3A1520' },
  memory: { bg: 'butter', ink: '#3A2E08' },
};

const AgendaRow = memo(function AgendaRow({ item }: { item: TimelineItem }) {
  const { C, F } = useTheme();
  const palette = AGENDA_COLORS[item.type];
  const bgColor = C[palette.bg];
  const time = item.occursAt !== null ? formatAgendaTime(item.occursAt) : 'All day';
  const who = item.isPrivate ? 'MINE' : 'BOTH';
  const cat = item.type;

  return (
    <View
      testID={`calendar-agenda-${item.id}`}
      style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}
    >
      <View style={{ width: 56, paddingTop: 14 }}>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: time === 'All day' ? 12 : 18,
            color: C.bone,
            letterSpacing: -0.3,
          }}
        >
          {time}
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1,
            marginTop: 2,
          }}
        >
          {who}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: bgColor,
          borderRadius: 20,
          padding: 16,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            fontSize: 9,
            fontFamily: F.bodyBold,
            letterSpacing: 1,
            color: '#000',
            opacity: 0.45,
            textTransform: 'uppercase',
          }}
        >
          {cat}
        </Text>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 18,
            color: palette.ink,
            letterSpacing: -0.3,
            marginBottom: item.subtitle ? 3 : 0,
            lineHeight: 21,
            paddingRight: 40,
          }}
        >
          {item.title}
        </Text>
        {!!item.subtitle && (
          <Text style={{ fontSize: 11, color: palette.ink, opacity: 0.6, fontFamily: F.body }}>
            {item.subtitle}
          </Text>
        )}
      </View>
    </View>
  );
});

function TomorrowRow({ card }: { card: NonNullable<TomorrowCard> }) {
  const { C, F } = useTheme();
  const accentColor = C[card.accent];
  const accentInk = C[`${card.accent}Ink` as 'mintInk' | 'peachInk' | 'butterInk'];
  return (
    <View
      testID={`calendar-tomorrow-${card.id}`}
      style={{
        backgroundColor: C.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: C.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: accentInk,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={card.kind === 'milestone' ? 'heart' : 'calendar'} size={16} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 15,
            color: C.bone,
            letterSpacing: -0.2,
          }}
        >
          {card.title}
        </Text>
        <Text style={{ fontSize: 11, color: C.fog, fontFamily: F.body }}>{card.subtitle}</Text>
      </View>
      <Text
        style={{
          fontSize: 10,
          color: accentColor,
          fontFamily: F.bodyBold,
          letterSpacing: 1,
        }}
      >
        {card.kind === 'milestone' ? 'MILESTONE' : 'EVENT'}
      </Text>
    </View>
  );
}

function EmptyAgenda() {
  const { C, F } = useTheme();
  return (
    <View
      testID="calendar-agenda-empty"
      style={{
        backgroundColor: C.card,
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: C.line,
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
      }}
    >
      <Icon name="calendar" size={22} color={C.fog} />
      <Text
        style={{
          fontFamily: F.displayBold,
          fontSize: 15,
          color: C.mist,
          letterSpacing: -0.2,
        }}
      >
        No events this day
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: C.fog,
          fontFamily: F.body,
          letterSpacing: 0.2,
          opacity: 0.85,
        }}
      >
        Tap + to add a reminder
      </Text>
    </View>
  );
}

function CalendarSkeleton() {
  const { C } = useTheme();
  const pulse = useSharedValue(0.6);
  React.useEffect(() => {
    pulse.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) });
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Screen>
      <Animated.View
        testID="calendar-hero-skeleton"
        style={[
          pulseStyle,
          {
            backgroundColor: C.butter,
            borderRadius: 26,
            height: 152,
            marginBottom: 22,
            opacity: 0.6,
          },
        ]}
      />
      <Animated.View style={[pulseStyle, { flexDirection: 'row', gap: 6, marginBottom: 22 }]}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={i}
            testID="calendar-day-skeleton"
            style={{ flex: 1, height: 54, borderRadius: 14, backgroundColor: C.cardHi }}
          />
        ))}
      </Animated.View>
      {Array.from({ length: 3 }).map((_, i) => (
        <Animated.View
          key={i}
          testID="calendar-agenda-skeleton"
          style={[
            pulseStyle,
            {
              flexDirection: 'row',
              gap: 14,
              marginBottom: 14,
            },
          ]}
        >
          <View style={{ width: 56, height: 48 }} />
          <View style={{ flex: 1, height: 76, borderRadius: 20, backgroundColor: C.cardHi }} />
        </Animated.View>
      ))}
    </Screen>
  );
}
