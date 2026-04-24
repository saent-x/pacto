import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  BlockCard,
  DateSectioned,
  Display,
  IconTile,
  Overline,
} from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { usePlans } from '@/src/hooks/usePlans';
import { useTheme } from '@/src/lib/theme';

type Bucket = 'This month' | 'Ongoing' | 'Later this year' | 'Someday';
type ColorKey = 'peach' | 'rose' | 'mint' | 'sky' | 'butter' | 'lavender';

const COLOR_KEYS: ColorKey[] = ['sky', 'peach', 'butter', 'rose', 'mint', 'lavender'];
const BUCKET_ORDER: Bucket[] = ['This month', 'Ongoing', 'Later this year', 'Someday'];
const KNOWN_BUCKETS: Bucket[] = BUCKET_ORDER;

type PlanRow = {
  id: string;
  title: string;
  sub: string;
  color: string;
  ink: string;
  colorKey: ColorKey;
  prog: number;
  tag: string;
  items: string;
  bucket: Bucket;
  icon: IconName;
  targetDate: string | null;
};

function bucketFromDate(targetDate: string | null): Bucket {
  if (!targetDate) return 'Ongoing';
  try {
    const diff = differenceInCalendarDays(parseISO(targetDate), new Date());
    if (diff < 0) return 'Ongoing';
    if (diff <= 31) return 'This month';
    if (diff <= 365) return 'Later this year';
    return 'Someday';
  } catch {
    return 'Someday';
  }
}

function deriveTag(bucket: Bucket, targetDate: string | null): string {
  if (!targetDate) {
    if (bucket === 'Ongoing') return 'ONGOING';
    if (bucket === 'Someday') return 'DREAMY';
    return 'IDEA';
  }
  try {
    const d = parseISO(targetDate);
    const diff = differenceInCalendarDays(d, new Date());
    if (bucket === 'This month') {
      if (diff <= 7) return 'SOON';
      return format(d, 'MMM').toUpperCase();
    }
    if (bucket === 'Ongoing') return 'ONGOING';
    if (bucket === 'Later this year') return format(d, 'MMM').toUpperCase();
    if (bucket === 'Someday') return 'DREAMY';
  } catch {}
  return 'IDEA';
}

function iconFromCategory(category: string | null | undefined): IconName {
  const c = (category ?? '').toLowerCase();
  if (c.includes('travel') || c.includes('trip')) return 'compass';
  if (c.includes('home') || c.includes('house')) return 'home';
  if (c.includes('gift') || c.includes('birthday')) return 'gift';
  if (c.includes('learn') || c.includes('skill')) return 'coffee';
  if (c.includes('milestone')) return 'star';
  return 'map';
}

export default function PlansScreen() {
  const { C, F } = useTheme();
  const { plans, isLoading } = usePlans();

  const rows = useMemo<PlanRow[]>(() => {
    return plans.map((raw: any, i: number): PlanRow => {
      const storedBucket = typeof raw.bucket === 'string' ? (raw.bucket as Bucket) : null;
      const targetDate = (raw.targetDate as string | null) ?? null;
      const bucket: Bucket =
        storedBucket && KNOWN_BUCKETS.includes(storedBucket)
          ? storedBucket
          : bucketFromDate(targetDate);
      const rawColor = raw.color as string | undefined;
      const colorKey: ColorKey =
        rawColor && COLOR_KEYS.includes(rawColor as ColorKey)
          ? (rawColor as ColorKey)
          : COLOR_KEYS[i % COLOR_KEYS.length];
      const icon: IconName =
        raw.icon && typeof raw.icon === 'string' ? (raw.icon as IconName) : iconFromCategory(raw.category);
      const prog = raw.status === 'done' ? 1 : 0;
      const description = (raw.description as string | null) ?? null;
      let sub = description ?? 'no target yet';
      if (!description && targetDate) {
        try {
          sub = format(parseISO(targetDate), 'MMM d, yyyy');
        } catch {
          sub = targetDate;
        }
      }
      return {
        id: String(raw.id),
        title: String(raw.title ?? ''),
        sub,
        color: (C as Record<string, string>)[colorKey] ?? C.peach,
        ink: (C as Record<string, string>)[`${colorKey}Ink`] ?? C.peachInk,
        colorKey,
        prog,
        tag: deriveTag(bucket, targetDate),
        items: prog > 0 ? `done` : 'Idea stage',
        bucket,
        icon,
        targetDate,
      };
    });
  }, [plans, C]);

  const avgProg = useMemo(() => {
    if (rows.length === 0) return 0;
    return rows.reduce((a, p) => a + p.prog, 0) / rows.length;
  }, [rows]);

  const bucketColor: Record<Bucket, string> = useMemo(
    () => ({
      'This month': C.peach,
      Ongoing: C.butter,
      'Later this year': C.mint,
      Someday: C.lavender,
    }),
    [C],
  );

  const sections = useMemo(
    () =>
      BUCKET_ORDER.map((b) => ({
        label: b.toUpperCase(),
        color: bucketColor[b],
        bucket: b,
        items: rows.filter((p) => p.bucket === b),
      })).filter((s) => s.items.length),
    [rows, bucketColor],
  );

  const footerCounts = useMemo(
    () => ({
      soon: rows.filter((r) => r.bucket === 'This month').length,
      ongoing: rows.filter((r) => r.bucket === 'Ongoing').length,
      later: rows.filter((r) => r.bucket === 'Later this year').length,
      someday: rows.filter((r) => r.bucket === 'Someday').length,
    }),
    [rows],
  );

  if (isLoading && rows.length === 0) return <IndexSkeleton />;
  if (rows.length === 0) return <EmptyPlans />;

  const renderPlan = (p: PlanRow, j: number) => (
    <Animated.View
      key={p.id}
      entering={FadeInDown.delay(Math.min(j, 10) * 60 + 80).duration(400)}
      style={{
        backgroundColor: p.color,
        borderRadius: 24,
        padding: 22,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              color: p.ink,
              fontFamily: F.bodyBold,
              letterSpacing: 1.4,
              opacity: 0.55,
              marginBottom: 4,
            }}
          >
            {p.tag}
          </Text>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 22,
              color: p.ink,
              letterSpacing: -0.6,
              lineHeight: 24,
            }}
          >
            {p.title}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: p.ink,
              opacity: 0.65,
              fontFamily: F.body,
              marginTop: 3,
            }}
          >
            {p.sub}
          </Text>
        </View>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: 'rgba(0,0,0,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={p.icon} size={18} color={p.ink} strokeWidth={2} />
        </View>
      </View>
      <View
        style={{
          height: 5,
          backgroundColor: 'rgba(0,0,0,0.12)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <AnimatedBar pct={p.prog * 100} color={p.ink} />
      </View>
      <View
        style={{
          marginTop: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: p.ink,
            fontFamily: F.bodyBold,
            letterSpacing: 0.6,
            opacity: 0.65,
          }}
        >
          {p.items}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: p.ink,
            fontFamily: F.bodyBold,
            letterSpacing: 0.6,
            opacity: 0.65,
          }}
        >
          {Math.round(p.prog * 100)}%
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(420)}>
        <BlockCard bg={C.sky} ink={C.skyInk} style={{ padding: 22, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Overline color="rgba(14,34,48,0.7)">Things we're building</Overline>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
                <Display size={54} color={C.skyInk}>{`${rows.length}`}</Display>
                <Text
                  style={{
                    fontSize: 14,
                    color: 'rgba(14,34,48,0.6)',
                    fontFamily: F.bodyBold,
                    marginBottom: 8,
                  }}
                >
                  {rows.length === 1 ? 'plan' : 'plans'}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(14,34,48,0.7)',
                  marginTop: 6,
                  fontFamily: F.body,
                }}
              >
                {Math.round(avgProg * 100)}% avg progress
              </Text>
            </View>
            <IconTile
              icon="compass"
              bg="rgba(14,34,48,0.15)"
              color={C.skyInk}
              size={44}
              radius={14}
              iconSize={20}
            />
          </View>
          <View
            style={{
              marginTop: 16,
              height: 6,
              backgroundColor: 'rgba(14,34,48,0.15)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <AnimatedBar pct={avgProg * 100} color={C.skyInk} />
          </View>
          <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            {[
              `SOON ${footerCounts.soon}`,
              `ONGOING ${footerCounts.ongoing}`,
              `LATER ${footerCounts.later}`,
              `SOMEDAY ${footerCounts.someday}`,
            ].map((t) => (
              <Text
                key={t}
                style={{
                  fontSize: 10,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.5,
                  color: 'rgba(14,34,48,0.75)',
                }}
              >
                {t}
              </Text>
            ))}
          </View>
        </BlockCard>
      </Animated.View>

      <DateSectioned sections={sections} maxOpen={3} renderItem={renderPlan} />
    </Screen>
  );
}

function EmptyPlans() {
  const { C, F } = useTheme();
  return (
    <Screen>
      <Pressable
        onPress={() => router.push('/sheets/new-plan' as any)}
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
        <Icon name="compass" size={22} color={C.fog} />
        <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
          No plans yet
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: C.fog,
            fontFamily: F.body,
            textAlign: 'center',
          }}
        >
          Start small: a weekend trip, a recipe to master.
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
          borderRadius: 24,
          backgroundColor: C.sky,
          opacity: 0.35,
          marginBottom: 22,
        }}
      />
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(60 + i * 60).duration(300)}
          style={{
            height: 120,
            borderRadius: 24,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            opacity: 0.55,
            marginBottom: 12,
          }}
        />
      ))}
    </Screen>
  );
}

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? pct : 0);
  useEffect(() => {
    if (reduced) {
      w.value = pct;
      return;
    }
    w.value = withTiming(pct, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct, reduced, w]);
  const style = useAnimatedStyle(() => ({
    width: `${w.value}%`,
  }));
  return (
    <Animated.View
      style={[{ height: '100%', backgroundColor: color }, style]}
    />
  );
}
