import { router } from 'expo-router';
import { useMemo } from 'react';
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
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { addDays, format, startOfWeek } from 'date-fns';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Screen } from '@/src/components/ui/Screen';
import { useCheckIns, getLocalDateKey, type CheckInRecord } from '@/src/hooks/useCheckIns';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

const MOOD_ICONS: IconName[] = ['sun', 'cloud', 'minus', 'cloudRain', 'zap'];
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

type DaySlot = {
  day: string;
  dateKey: string;
  past: boolean;
  me: number | null;
  them: number | null;
};

function coerceMood(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(4, Math.max(0, Math.round(n)));
}

function buildWeek(
  checkIns: CheckInRecord[],
  userId: string | null,
  now: Date,
): DaySlot[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const todayKey = getLocalDateKey(now);
  return DAY_LABELS.map((day, i) => {
    const date = addDays(monday, i);
    const dateKey = getLocalDateKey(date);
    const myRec = checkIns.find((c) => c.authorId === userId && c.checkInDate === dateKey);
    const partnerRec = checkIns.find((c) => c.authorId !== userId && c.checkInDate === dateKey);
    return {
      day,
      dateKey,
      past: dateKey <= todayKey,
      me: coerceMood(myRec?.mood ?? null),
      them: coerceMood(partnerRec?.mood ?? null),
    };
  });
}

// solo-mode: partner column + sync metric hidden (legend, cells, label)
export default function Checkins() {
  const { C, F } = useTheme();
  const { isSolo, partner, user } = useSession();
  const { checkIns, myTodayCheckIn, isLoading } = useCheckIns();

  const week = useMemo(
    () => buildWeek(checkIns, user?.id ?? null, new Date()),
    [checkIns, user?.id],
  );

  const possibleDays = week.filter((d) => d.past).length;
  const myDays = week.filter((d) => d.past && d.me != null).length;
  const bothDays = week.filter((d) => d.past && d.me != null && d.them != null).length;
  const pct = possibleDays
    ? Math.round(((isSolo ? myDays : bothDays) / possibleDays) * 100)
    : 0;

  const partnerLabel = (partner?.displayName ?? 'Partner').toUpperCase();
  const hasData = checkIns.length > 0;

  if (isLoading && !hasData) return <IndexSkeleton />;

  const todayChecked = !!myTodayCheckIn;
  const heroSubtitle = isSolo
    ? `${myDays} of ${possibleDays || 0} days logged${pct === 100 && possibleDays > 0 ? ' — streak.' : ''}`
    : `${bothDays} of ${possibleDays || 0} days you've both checked in${pct === 100 && possibleDays > 0 ? ' — streak.' : ''}`;

  const goToSheet = () => {
    Haptics.selectionAsync();
    router.push('/sheets/new-checkin');
  };

  return (
    <Screen>
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={{ backgroundColor: C.butter, borderRadius: 24, padding: 22, marginBottom: 18 }}
      >
        <Text
          style={{
            fontSize: 10,
            color: C.butterInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.2,
            opacity: 0.55,
            marginBottom: 6,
          }}
        >
          THIS WEEK · {isSolo ? 'CHECK-INS' : 'IN SYNC'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 54,
              color: C.butterInk,
              lineHeight: 50,
              letterSpacing: -2,
            }}
          >
            {pct}
            <Text style={{ fontSize: 28 }}>%</Text>
          </Text>
          <Text
            style={{
              flex: 1,
              marginBottom: 8,
              fontSize: 12,
              color: C.butterInk,
              opacity: 0.6,
              fontFamily: F.bodyBold,
            }}
          >
            {heroSubtitle}
          </Text>
        </View>
        <View
          style={{
            height: 6,
            backgroundColor: 'rgba(0,0,0,0.12)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <AnimatedBar pct={pct} color={C.butterInk} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
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
          THIS WEEK
        </Text>

        <View
          style={{
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 22,
            padding: 18,
            marginBottom: 22,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.peach }} />
            <Text style={{ fontSize: 10, color: C.fog, fontFamily: F.bodyBold, letterSpacing: 1 }}>
              YOU
            </Text>
            {!isSolo && (
              <>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: C.lavender,
                    marginLeft: 8,
                  }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    color: C.fog,
                    fontFamily: F.bodyBold,
                    letterSpacing: 1,
                  }}
                >
                  {partnerLabel}
                </Text>
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {week.map((d) => (
              <View key={d.day} style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 9,
                    color: C.fog,
                    fontFamily: F.bodyBold,
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  {d.day}
                </Text>
                <Cell value={d.me} color={C.peach} ink={C.peachInk} past={d.past} />
                {!isSolo && (
                  <Cell value={d.them} color={C.lavender} ink={C.lavenderInk} past={d.past} />
                )}
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(400)}>
        <Text
          style={{
            fontSize: 11,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            paddingLeft: 4,
            marginBottom: 10,
          }}
        >
          TODAY · {todayChecked ? 'CHECKED IN' : 'NOT CHECKED IN YET'}
        </Text>
        <PressScale
          onPress={goToSheet}
          style={{
            backgroundColor: C.gold,
            borderRadius: 18,
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: C.peachInk, fontFamily: F.displayBold, fontSize: 15 }}>
            {todayChecked ? 'Update how today feels' : 'Share how today feels'}
          </Text>
          <Icon name="arrowRight" size={18} color={C.peachInk} strokeWidth={2.5} />
        </PressScale>
      </Animated.View>

      {!hasData && (
        <Animated.View
          entering={FadeIn.delay(260).duration(360)}
          style={{
            marginTop: 22,
            padding: 22,
            borderRadius: 22,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: C.line,
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="sun" size={22} color={C.fog} />
          <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
            Start your first check-in
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: C.fog,
              fontFamily: F.body,
              textAlign: 'center',
            }}
          >
            Tap above to log how today feels.
          </Text>
        </Animated.View>
      )}
    </Screen>
  );
}

function Cell({
  value,
  color,
  ink,
  past,
}: {
  value: number | null;
  color: string;
  ink: string;
  past: boolean;
}) {
  const { C } = useTheme();
  const filled = value != null;
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: filled ? color : 'transparent',
        borderWidth: filled ? 0 : 1.5,
        borderStyle: 'dashed',
        borderColor: past ? C.line : 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: past || filled ? 1 : 0.6,
      }}
    >
      {filled && <Icon name={MOOD_ICONS[value!]} size={12} color={ink} strokeWidth={2.5} />}
    </View>
  );
}

function IndexSkeleton() {
  const { C } = useTheme();
  return (
    <Screen>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={{
          height: 158,
          borderRadius: 24,
          backgroundColor: C.butter,
          opacity: 0.35,
          marginBottom: 18,
        }}
      />
      <Animated.View
        entering={FadeIn.delay(80).duration(300)}
        style={{
          height: 116,
          borderRadius: 22,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          opacity: 0.6,
          marginBottom: 22,
        }}
      />
      <Animated.View
        entering={FadeIn.delay(160).duration(300)}
        style={{
          height: 52,
          borderRadius: 18,
          backgroundColor: C.cardHi,
          opacity: 0.5,
        }}
      />
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
