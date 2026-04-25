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
      {/* Shared spaces header */}
      <Animated.View
        entering={enter(0)}
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
      <Animated.View entering={enter(1)} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1.3 }}>
          <FeatureCard f={features[0]} variant="big" />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <FeatureCard f={features[1]} variant="flat" />
          <FeatureCard f={features[2]} variant="flat" />
        </View>
      </Animated.View>

      {/* Medium row */}
      <Animated.View entering={enter(2)} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[3]} />
        </View>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[4]} />
        </View>
      </Animated.View>

      <Animated.View entering={enter(3)} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[5]} />
        </View>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[6]} />
        </View>
      </Animated.View>

      {features[7] && (
        <Animated.View entering={enter(4)} style={{ marginBottom: 10 }}>
          <FeatureCard f={features[7]} variant="wide" />
        </Animated.View>
      )}
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
