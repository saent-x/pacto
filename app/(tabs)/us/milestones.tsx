import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useMilestones } from '@/src/hooks/useMilestones';
import { useTheme } from '@/src/lib/theme';

type ColorKey = 'peach' | 'rose' | 'mint' | 'sky' | 'butter' | 'lavender';
const COLOR_KEYS: ColorKey[] = ['peach', 'rose', 'mint', 'sky', 'butter', 'lavender'];
const DEFAULT_ROTATION: ColorKey[] = ['peach', 'rose', 'mint', 'sky', 'butter'];

type MilestoneRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  color: ColorKey | null;
  quote: string | null;
  repeatYearly: boolean;
};

function toRow(m: unknown): MilestoneRow {
  const raw = m as Record<string, unknown>;
  const color = typeof raw.color === 'string' && COLOR_KEYS.includes(raw.color as ColorKey)
    ? (raw.color as ColorKey)
    : null;
  return {
    id: String(raw.id),
    title: String(raw.title ?? ''),
    description: (raw.description as string | null) ?? null,
    date: String(raw.date ?? ''),
    color,
    quote: (raw.quote as string | null) ?? null,
    repeatYearly: Boolean(raw.repeatYearly),
  };
}

export default function Milestones() {
  const { C, F } = useTheme();
  const { milestones, upcoming, isLoading } = useMilestones();

  const rows = useMemo(() => milestones.map(toRow), [milestones]);

  const nextStone = useMemo(() => {
    const list = upcoming.map(toRow).sort((a, b) => a.date.localeCompare(b.date));
    return list[0] ?? null;
  }, [upcoming]);

  const timeline = useMemo(
    () =>
      rows
        .filter((r) => !nextStone || r.id !== nextStone.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [rows, nextStone],
  );

  if (isLoading && rows.length === 0) return <IndexSkeleton />;
  if (rows.length === 0) return <EmptyMilestones />;

  const todayKey = format(new Date(), 'yyyy-MM-dd');

  return (
    <Screen>
      {nextStone ? <Hero stone={nextStone} /> : null}
      {!nextStone && timeline.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text
            style={{
              fontSize: 11,
              color: C.fog,
              fontFamily: F.bodyBold,
              letterSpacing: 1.4,
              paddingLeft: 4,
              marginBottom: 12,
            }}
          >
            PAST CHAPTERS
          </Text>
        </Animated.View>
      ) : null}

      {timeline.map((stone, i) => {
        const fallback = DEFAULT_ROTATION[i % DEFAULT_ROTATION.length];
        const colorKey = stone.color ?? fallback;
        const color = (C as Record<string, string>)[colorKey];
        const ink = (C as Record<string, string>)[`${colorKey}Ink`] ?? C.bone;
        const fut = stone.date > todayKey;
        let year = '';
        let month = '';
        try {
          const d = parseISO(stone.date);
          year = format(d, 'yyyy');
          month = format(d, 'MMM dd').toUpperCase();
        } catch {
          year = stone.date.slice(0, 4);
          month = stone.date.slice(5).toUpperCase();
        }
        return (
          <Animated.View
            key={stone.id}
            entering={FadeInDown.delay(Math.min(i, 10) * 60 + 80).duration(400)}
            style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}
          >
            <View style={{ width: 50, alignItems: 'flex-end', paddingTop: 16 }}>
              <Text
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 18,
                  color: C.bone,
                  letterSpacing: -0.4,
                  lineHeight: 18,
                }}
              >
                {year}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: C.fog,
                  fontFamily: F.bodyBold,
                  letterSpacing: 1,
                  marginTop: 3,
                }}
              >
                {month}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: color,
                borderRadius: 18,
                padding: 16,
                opacity: fut ? 0.55 : 1,
                borderWidth: fut ? 1.5 : 0,
                borderStyle: 'dashed',
                borderColor: 'rgba(0,0,0,0.3)',
              }}
            >
              <Text
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 17,
                  color: ink,
                  letterSpacing: -0.3,
                  lineHeight: 19,
                }}
              >
                {stone.title}
              </Text>
              {stone.description ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: ink,
                    opacity: 0.65,
                    fontFamily: F.body,
                    marginTop: 3,
                  }}
                >
                  {stone.description}
                </Text>
              ) : null}
              {stone.repeatYearly ? (
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 9,
                    color: ink,
                    opacity: 0.6,
                    fontFamily: F.bodyBold,
                    letterSpacing: 1,
                  }}
                >
                  REPEATS YEARLY
                </Text>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </Screen>
  );
}

function Hero({ stone }: { stone: MilestoneRow }) {
  const { C, F } = useTheme();
  const colorKey = stone.color ?? 'peach';
  const bg = (C as Record<string, string>)[colorKey] ?? C.peach;
  const ink = (C as Record<string, string>)[`${colorKey}Ink`] ?? C.peachInk;

  const days = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(stone.date), new Date());
    } catch {
      return null;
    }
  }, [stone.date]);

  const numeralMatch = stone.title.match(/\d+/);
  const numeral = numeralMatch?.[0] ?? (days != null ? String(Math.max(0, days)) : '');

  const [word1, ...rest] = stone.title.split(/\s+/);
  const word2 = rest.join(' ');

  const inDays =
    days == null
      ? 'SOON'
      : days === 0
      ? 'TODAY'
      : days === 1
      ? 'IN 1 DAY'
      : `IN ${days} DAYS`;

  const quote = stone.quote ?? stone.description ?? null;

  return (
    <Animated.View
      entering={FadeInDown.duration(420)}
      style={{
        backgroundColor: bg,
        borderRadius: 26,
        padding: 22,
        marginBottom: 22,
        overflow: 'hidden',
      }}
    >
      {numeral ? (
        <Text
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            fontFamily: F.displayBold,
            fontSize: 140,
            color: 'rgba(0,0,0,0.06)',
            letterSpacing: -4,
          }}
        >
          {numeral}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: 10,
          color: ink,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          opacity: 0.55,
          marginBottom: 8,
        }}
      >
        {`NEXT · ${inDays}`}
      </Text>
      <Text
        style={{
          fontFamily: F.displayBold,
          fontSize: 32,
          color: ink,
          letterSpacing: -1,
          lineHeight: 34,
        }}
      >
        {word2 ? `${word1}\n${word2}.` : `${word1}.`}
      </Text>
      {quote ? (
        <Text
          style={{
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 13,
            color: ink,
            opacity: 0.7,
            marginTop: 10,
            maxWidth: 240,
          }}
        >
          {`"${quote}"`}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function EmptyMilestones() {
  const { C, F } = useTheme();
  return (
    <Screen>
      <Pressable
        onPress={() => router.push('/sheets/new-milestone')}
        style={{
          marginTop: 8,
          padding: 24,
          borderRadius: 22,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: C.line,
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name="flag" size={22} color={C.fog} />
        <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
          Mark your first milestone
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: C.fog,
            fontFamily: F.body,
            textAlign: 'center',
          }}
        >
          Anniversaries, first trips, quiet Sundays — anything worth remembering.
        </Text>
      </Pressable>
    </Screen>
  );
}

function IndexSkeleton() {
  const { C } = useTheme();
  return (
    <Screen>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={{
          height: 168,
          borderRadius: 26,
          backgroundColor: C.peach,
          opacity: 0.35,
          marginBottom: 22,
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(60 + i * 60).duration(300)}
          style={{
            flexDirection: 'row',
            gap: 14,
            marginBottom: 12,
          }}
        >
          <View style={{ width: 50 }} />
          <View
            style={{
              flex: 1,
              height: 62,
              borderRadius: 18,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              opacity: 0.55,
            }}
          />
        </Animated.View>
      ))}
    </Screen>
  );
}
