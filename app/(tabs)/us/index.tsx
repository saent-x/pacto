import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import { useLoveNotes } from '@/src/hooks/useLoveNotes';
import { useCheckIns } from '@/src/hooks/useCheckIns';
import { useExpenses } from '@/src/hooks/useExpenses';
import { useWishlists } from '@/src/hooks/useWishlists';
import { useMilestones } from '@/src/hooks/useMilestones';
import { usePlans } from '@/src/hooks/usePlans';
import { useJournal } from '@/src/hooks/useJournal';

type ColorKey = 'rose' | 'butter' | 'mint' | 'lavender' | 'peach' | 'sky';

type Feature = {
  key: string;
  href: string;
  label: string;
  sub: string;
  count: string;
  icon: IconName;
  color: ColorKey;
};

const QUOTES = [
  { t: "Morning sunshine. Coffee's on, your socks are in the dryer.", from: 'Sofia', time: '7:14 AM' },
  { t: 'The way you sang along to Caetano last night.', from: 'Sofia', time: 'Wed' },
  { t: 'Thinking about Venice already.', from: 'You', time: 'Wed' },
];

const PLACEHOLDERS: Record<string, { count: string; sub: string }> = {
  notes: { count: '124', sub: '2 new' },
  checkins: { count: '86%', sub: 'You · good' },
  expenses: { count: '€524', sub: 'Sofia owes €42' },
  wishlists: { count: '14', sub: '6 items' },
  milestones: { count: '3d', sub: '3 yrs Fri' },
  plans: { count: '2', sub: 'Venice · 3d' },
  timetables: { count: '4', sub: '4 rhythms' },
  journal: { count: '184', sub: '4 entries' },
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateISO}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function UsEditorial() {
  const { C, F } = useTheme();
  const { activeCouple } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const loveNotes = useLoveNotes();
  const checkins = useCheckIns();
  const expenses = useExpenses();
  const wishlists = useWishlists();
  const milestones = useMilestones();
  const plans = usePlans(['active']);
  const journal = useJournal();

  const { data: wlItemsData, isLoading: wlItemsLoading } = (db as any).useQuery(
    coupleId ? { wishlistItems: { $: { where: { 'couple.id': coupleId } } } } : null,
  );
  const { data: ttData, isLoading: ttLoading } = (db as any).useQuery(
    coupleId ? { timetables: { $: { where: { 'couple.id': coupleId } } } } : null,
  );

  const features: Feature[] = useMemo(() => {
    const wishItemCount = wlItemsData?.wishlistItems?.length ?? 0;
    const timetableCount = ttData?.timetables?.length ?? 0;

    const notes = loveNotes.isLoading
      ? PLACEHOLDERS.notes
      : { count: String(loveNotes.notes.length), sub: `${loveNotes.notes.length} total` };

    const cin = checkins.isLoading
      ? PLACEHOLDERS.checkins
      : {
          count: `${checkins.todayCheckIns.length}/2`,
          sub: `You · ${checkins.myTodayCheckIn?.mood ?? '—'}`,
        };

    const exp = expenses.isLoading
      ? PLACEHOLDERS.expenses
      : (() => {
          const sum = expenses.unsettled.reduce((a: number, e: any) => a + (e.amount ?? 0), 0);
          return {
            count: `€${Math.round(sum)}`,
            sub: expenses.unsettled.length ? `${expenses.unsettled.length} owed` : 'Settled',
          };
        })();

    const wl = wishlists.isLoading || wlItemsLoading
      ? PLACEHOLDERS.wishlists
      : {
          count: String(wishItemCount),
          sub: `${wishlists.wishlists.length} ${wishlists.wishlists.length === 1 ? 'list' : 'lists'}`,
        };

    const ms = milestones.isLoading
      ? PLACEHOLDERS.milestones
      : (() => {
          const next = milestones.upcoming[0];
          if (!next) return { count: '—', sub: 'Add a milestone' };
          const d = daysUntil(next.date as string);
          const wd = WEEKDAY_SHORT[new Date(`${next.date}T00:00:00`).getDay()];
          return {
            count: d <= 0 ? 'Today' : `${d}d`,
            sub: `${next.title} · ${wd}`,
          };
        })();

    const pl = plans.isLoading
      ? PLACEHOLDERS.plans
      : {
          count: String(plans.plans.length),
          sub: (plans.plans[0] as any)?.title ?? 'Add a plan',
        };

    const tt = ttLoading
      ? PLACEHOLDERS.timetables
      : {
          count: String(timetableCount),
          sub: `${timetableCount} ${timetableCount === 1 ? 'rhythm' : 'rhythms'}`,
        };

    const jr = journal.isLoading
      ? PLACEHOLDERS.journal
      : {
          count: String(journal.allEntries.length),
          sub: `${journal.allEntries.length} entries`,
        };

    return [
      { key: 'notes', href: '/us/notes', label: 'Love notes', icon: 'heart', color: 'rose', ...notes },
      { key: 'checkins', href: '/us/checkins', label: 'Check-ins', icon: 'sun', color: 'butter', ...cin },
      { key: 'expenses', href: '/us/expenses', label: 'Expenses', icon: 'dollarSign', color: 'mint', ...exp },
      { key: 'wishlists', href: '/us/wishlists', label: 'Wishlists', icon: 'gift', color: 'lavender', ...wl },
      { key: 'milestones', href: '/us/milestones', label: 'Milestones', icon: 'flag', color: 'peach', ...ms },
      { key: 'plans', href: '/us/plans', label: 'Plans', icon: 'map', color: 'sky', ...pl },
      { key: 'timetables', href: '/us/timetables', label: 'Timetables', icon: 'calendar', color: 'peach', ...tt },
      { key: 'journal', href: '/us/journal', label: 'Journal', icon: 'feather', color: 'butter', ...jr },
    ];
  }, [
    loveNotes.isLoading, loveNotes.notes,
    checkins.isLoading, checkins.todayCheckIns, checkins.myTodayCheckIn,
    expenses.isLoading, expenses.unsettled,
    wishlists.isLoading, wishlists.wishlists,
    wlItemsLoading, wlItemsData,
    milestones.isLoading, milestones.upcoming,
    plans.isLoading, plans.plans,
    ttLoading, ttData,
    journal.isLoading, journal.allEntries,
  ]);

  const enter = (i: number) => FadeInDown.delay(i * 60).duration(420);

  return (
    <Screen>
      {/* Date pill */}
      <Animated.View
        entering={enter(0)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginBottom: 18,
          alignSelf: 'center',
        }}
      >
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold }} />
        <Text
          style={{
            fontSize: 10,
            fontFamily: F.bodyBold,
            letterSpacing: 1.2,
            color: C.mist,
            textTransform: 'uppercase',
          }}
        >
          THU · 17 · 11 · MATTIA × SOFIA
        </Text>
      </Animated.View>

      {/* Mood strip */}
      <Animated.View entering={enter(1)}>
        <Text
          style={{
            fontSize: 10,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            marginBottom: 10,
          }}
        >
          MOOD · TODAY
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <MoodSlab
            label="YOU"
            mood="Good"
            sub="7h sleep · calm"
            bg={C.peach}
            ink={C.peachInk}
            bars={[1, 1, 0.7, 1, 0.4]}
          />
          <MoodSlab
            label="SOFIA"
            mood="Bright"
            sub="Just finished yoga"
            bg={C.lavender}
            ink={C.lavenderInk}
            bars={[0.5, 1, 1, 1, 0.7]}
          />
        </View>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 10,
            color: C.gold,
            fontFamily: F.bodyBold,
            letterSpacing: 1.2,
            marginBottom: 18,
          }}
        >
          ◇ 86% IN SYNC · 4-DAY STREAK
        </Text>
      </Animated.View>

      {/* Quote */}
      <Animated.View
        entering={enter(2)}
        style={{
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 22,
          paddingVertical: 22,
          paddingHorizontal: 24,
          marginBottom: 18,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            position: 'absolute',
            top: 4,
            right: 12,
            fontFamily: F.serif,
            fontSize: 84,
            color: C.gold,
            opacity: 0.3,
          }}
        >
          "
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            marginBottom: 10,
          }}
        >
          NOTE OF THE DAY · FROM SOFIA · 7:14 AM
        </Text>
        <Text
          style={{
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 17,
            color: C.bone,
            lineHeight: 24,
          }}
        >
          Morning sunshine. Coffee's on, your socks are in the dryer. I love our Thursdays.
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 14, gap: 6 }}>
          {QUOTES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === 0 ? 20 : 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: i === 0 ? C.gold : C.line,
              }}
            />
          ))}
        </View>
      </Animated.View>

      {/* Countdown */}
      <Animated.View entering={enter(3)}>
        <PressableScale
          onPress={() => router.push('/us/milestones' as any)}
          testID="us-countdown"
          style={{
            backgroundColor: C.peach,
            borderRadius: 22,
            paddingVertical: 20,
            paddingHorizontal: 22,
            marginBottom: 22,
            overflow: 'hidden',
          }}
        >
          <Text
            style={{
              position: 'absolute',
              right: -10,
              top: -30,
              fontFamily: F.displayBold,
              fontSize: 170,
              color: C.peachInk,
              opacity: 0.08,
              letterSpacing: -6,
            }}
          >
            03
          </Text>
          <Text
            style={{
              fontSize: 9,
              color: C.peachInk,
              fontFamily: F.bodyBold,
              letterSpacing: 1.4,
              opacity: 0.55,
            }}
          >
            COUNTDOWN · FRIDAY
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 64,
                color: C.peachInk,
                letterSpacing: -2.2,
                lineHeight: 64,
              }}
            >
              3
            </Text>
            <View>
              <Text
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 20,
                  color: C.peachInk,
                  letterSpacing: -0.5,
                }}
              >
                days until
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: C.peachInk,
                  opacity: 0.7,
                  fontFamily: F.serif,
                  fontStyle: 'italic',
                  marginTop: 2,
                }}
              >
                3rd anniversary
              </Text>
            </View>
          </View>
        </PressableScale>
      </Animated.View>

      {/* Shared spaces header */}
      <Animated.View
        entering={enter(4)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
          }}
        >
          OUR SHARED SPACES · {features.length}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: C.gold,
            fontFamily: F.bodyBold,
            letterSpacing: 1,
          }}
        >
          EDIT →
        </Text>
      </Animated.View>

      {/* Asymmetric grid: 1 big + 2 small */}
      <Animated.View entering={enter(5)} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1.3 }}>
          <FeatureCard f={features[0]} variant="big" />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <FeatureCard f={features[1]} variant="flat" />
          <FeatureCard f={features[2]} variant="flat" />
        </View>
      </Animated.View>

      {/* Medium row */}
      <Animated.View entering={enter(6)} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[3]} />
        </View>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[4]} />
        </View>
      </Animated.View>

      <Animated.View entering={enter(7)} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[5]} />
        </View>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[6]} />
        </View>
      </Animated.View>

      {features[7] && (
        <Animated.View entering={enter(8)} style={{ marginBottom: 10 }}>
          <FeatureCard f={features[7]} variant="wide" />
        </Animated.View>
      )}

      {/* On this day */}
      <Animated.View
        entering={enter(9)}
        style={{
          backgroundColor: C.rose,
          borderRadius: 20,
          paddingVertical: 18,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginTop: 12,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            backgroundColor: C.roseInk,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 20,
              color: C.rose,
              letterSpacing: -0.5,
            }}
          >
            '24
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              fontFamily: F.bodyBold,
              letterSpacing: 1.4,
              color: C.roseInk,
              opacity: 0.55,
            }}
          >
            ON THIS DAY · ONE YEAR AGO
          </Text>
          <Text
            style={{
              fontFamily: F.serif,
              fontStyle: 'italic',
              fontSize: 14,
              color: C.roseInk,
              lineHeight: 20,
              marginTop: 3,
            }}
          >
            "First morning in the new place. Kitchen smells like cardboard and coffee."
          </Text>
        </View>
      </Animated.View>
    </Screen>
  );
}

function PressableScale({
  children,
  onPress,
  style,
  testID,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 120 });
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function MoodSlab({
  label,
  mood,
  sub,
  bg,
  ink,
  bars,
}: {
  label: string;
  mood: string;
  sub: string;
  bg: string;
  ink: string;
  bars: number[];
}) {
  const { F } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 22,
        padding: 16,
        height: 148,
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          color: ink,
          opacity: 0.55,
        }}
      >
        {label}
      </Text>
      <View>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 38,
            color: ink,
            letterSpacing: -1,
            lineHeight: 38,
          }}
        >
          {mood}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: ink,
            opacity: 0.65,
            fontFamily: F.body,
            marginTop: 4,
          }}
        >
          {sub}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {bars.map((o, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 4, backgroundColor: ink, opacity: o, borderRadius: 2 }}
          />
        ))}
      </View>
    </View>
  );
}

function FeatureCard({
  f,
  variant,
}: {
  f: Feature;
  variant?: 'big' | 'flat' | 'wide';
}) {
  const { C, F } = useTheme();
  const bg = C[f.color] as string;
  const inkKey = (`${f.color}Ink` as const) as keyof typeof C;
  const ink = C[inkKey] as string;
  const big = variant === 'big';
  const flat = variant === 'flat';
  const padding = flat ? 14 : 16;
  const minH = big ? 200 : flat ? 0 : 120;

  return (
    <PressableScale
      testID={`us-card-${f.key}`}
      onPress={() => router.push(f.href as any)}
      style={{
        backgroundColor: bg,
        borderRadius: 18,
        padding: padding,
        minHeight: minH,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {big && (
        <Text
          style={{
            position: 'absolute',
            right: -10,
            bottom: -30,
            fontFamily: F.displayBold,
            fontSize: 130,
            color: ink,
            opacity: 0.08,
            letterSpacing: -4,
          }}
        >
          {f.count}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <View
          style={{
            width: flat ? 26 : 32,
            height: flat ? 26 : 32,
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={f.icon} size={flat ? 13 : 15} color={ink} />
        </View>
        {!flat && !big && (
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 14,
              color: ink,
              letterSpacing: -0.3,
              opacity: 0.9,
            }}
          >
            {f.count}
          </Text>
        )}
      </View>
      <View style={{ marginTop: flat ? 8 : big ? 20 : 14 }}>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: big ? 24 : flat ? 14 : 16,
            color: ink,
            letterSpacing: -0.4,
            lineHeight: big ? 24 : flat ? 14 : 16,
          }}
        >
          {f.label}
        </Text>
        <Text
          style={{
            fontSize: flat ? 10 : 11,
            color: ink,
            opacity: 0.6,
            fontFamily: F.body,
            marginTop: 3,
          }}
        >
          {f.sub}
        </Text>
      </View>
    </PressableScale>
  );
}
