import { router } from 'expo-router';
import { useMemo } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format, parseISO, subDays } from 'date-fns';
import { Avatar, BlockCard, Overline } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useJournal, type JournalFilter } from '@/src/hooks/useJournal';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import type { JournalEntry } from '@/src/types/database';

type MoodKey = 'great' | 'good' | 'okay' | 'low' | 'rough';
type MoodColorKey = 'mint' | 'sky' | 'butter' | 'rose' | 'peach';

const JOURNAL_MOOD: Record<MoodKey, { icon: IconName; colorKey: MoodColorKey }> = {
  great: { icon: 'sun', colorKey: 'mint' },
  good: { icon: 'cloud', colorKey: 'sky' },
  okay: { icon: 'minus', colorKey: 'butter' },
  low: { icon: 'cloudRain', colorKey: 'rose' },
  rough: { icon: 'zap', colorKey: 'peach' },
};
const MOOD_FALLBACK = { icon: 'minus' as IconName, colorKey: 'butter' as MoodColorKey };

function moodFor(mood: string | null) {
  if (!mood) return MOOD_FALLBACK;
  return JOURNAL_MOOD[mood as MoodKey] ?? MOOD_FALLBACK;
}

function formatEntryDate(entryDate: string) {
  try {
    return format(parseISO(entryDate), 'EEE, MMM d').toUpperCase();
  } catch {
    return entryDate.toUpperCase();
  }
}

export default function Journal() {
  const { C, F } = useTheme();
  const { user, partner, isSolo } = useSession();
  const { entries, allEntries, filter, setFilter, isLoading } = useJournal();

  const userId = user?.id ?? null;
  const partnerName = partner?.displayName ?? 'Partner';

  const tabs = useMemo<{ k: JournalFilter; label: string }[]>(
    () =>
      isSolo
        ? [
            { k: 'all', label: 'All' },
            { k: 'private', label: 'Private' },
          ]
        : [
            { k: 'all', label: 'All' },
            { k: 'shared', label: 'Shared' },
            { k: 'private', label: 'Private' },
          ],
    [isSolo],
  );

  const featured = useMemo(() => {
    const shared = allEntries.filter((e) => !e.is_private);
    return (
      shared.find((e) => e.author_id !== userId) ??
      shared[0] ??
      allEntries[0] ??
      null
    );
  }, [allEntries, userId]);

  const thisWeekCount = useMemo(() => {
    const cutoff = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    return allEntries.filter((e) => e.entry_date >= cutoff).length;
  }, [allEntries]);

  const hasAny = allEntries.length > 0;
  if (isLoading && !hasAny) return <IndexSkeleton />;

  return (
    <Screen>
      {featured ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <BlockCard bg={C.butter} ink={C.butterInk} style={{ marginBottom: 16, padding: 22 }}>
            <Overline color="rgba(58,46,8,0.7)">
              {`This week · ${thisWeekCount} ${thisWeekCount === 1 ? 'entry' : 'entries'}`}
            </Overline>
            <Text
              style={{
                marginTop: 12,
                fontFamily: F.serif,
                fontStyle: 'italic',
                fontSize: 20,
                lineHeight: 27,
                color: C.butterInk,
                maxWidth: 260,
              }}
              numberOfLines={4}
            >
              {`"${snippet(featured.body, 140)}"`}
            </Text>
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 18,
                  height: 2,
                  backgroundColor: C.butterInk,
                  borderRadius: 1,
                  opacity: 0.6,
                }}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: F.bodyBold,
                  letterSpacing: 1,
                  color: 'rgba(58,46,8,0.8)',
                }}
              >
                {`${authorName(featured, userId, user?.displayName, partnerName).toUpperCase()} · ${formatEntryDate(
                  featured.entry_date,
                )}`}
              </Text>
            </View>
          </BlockCard>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <TabBar tabs={tabs} value={filter} onChange={setFilter} />
      </Animated.View>

      {hasAny ? (
        entries.length === 0 ? (
          <EmptyFiltered />
        ) : (
          <View style={{ gap: 12 }}>
            {entries.map((entry, i) => (
              <Animated.View
                key={entry.id}
                entering={FadeInDown.delay(Math.min(i, 10) * 60 + 120).duration(380)}
              >
                <EntryCard entry={entry} userId={userId} partnerName={partnerName} />
              </Animated.View>
            ))}
          </View>
        )
      ) : (
        <EmptyJournal />
      )}
    </Screen>
  );
}

function snippet(text: string, max: number) {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function authorName(
  entry: JournalEntry,
  userId: string | null,
  myName: string | null | undefined,
  partnerName: string,
) {
  if (entry.author_id === userId) return myName ?? 'You';
  return partnerName;
}

function EntryCard({
  entry,
  userId,
  partnerName,
}: {
  entry: JournalEntry;
  userId: string | null;
  partnerName: string;
}) {
  const { C, F } = useTheme();
  const mood = moodFor(entry.mood ?? null);
  const moodColor = (C as Record<string, string>)[mood.colorKey] ?? C.butter;
  const fromPartner = entry.author_id !== userId;
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 18,
        padding: 18,
        paddingLeft: fromPartner ? 20 : 18,
        borderLeftWidth: fromPartner ? 3 : 1,
        borderLeftColor: fromPartner ? C.gold : C.line,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              fontSize: 10,
              color: C.fog,
              fontFamily: F.bodyBold,
              letterSpacing: 1,
            }}
          >
            {formatEntryDate(entry.entry_date)}
          </Text>
          {entry.is_private && <Icon name="lock" size={10} color={C.fog} />}
        </View>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: `${moodColor}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={mood.icon} size={12} color={moodColor} strokeWidth={2.5} />
        </View>
      </View>
      {entry.title ? (
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 18,
            color: C.bone,
            marginBottom: 4,
          }}
        >
          {entry.title}
        </Text>
      ) : null}
      <Text
        numberOfLines={2}
        style={{ fontSize: 13, color: C.mist, lineHeight: 20, fontFamily: F.body }}
      >
        {entry.body}
      </Text>
      {fromPartner ? (
        <View
          style={{
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Avatar
            letter={partnerName.charAt(0).toUpperCase()}
            size={18}
            bg={C.lavender}
            color={C.lavenderInk}
          />
          <Text
            style={{
              fontSize: 10,
              color: C.gold,
              fontFamily: F.bodyBold,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            {partnerName}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function TabBar({
  tabs,
  value,
  onChange,
}: {
  tabs: { k: JournalFilter; label: string }[];
  value: JournalFilter;
  onChange: (k: JournalFilter) => void;
}) {
  const { C, F } = useTheme();
  const indicator = useSharedValue({ left: 0, width: 0 });
  const layouts = useMemo(
    () => new Map<JournalFilter, { x: number; w: number }>(),
    [],
  );

  const updateIndicator = (k: JournalFilter) => {
    const l = layouts.get(k);
    if (!l) return;
    indicator.value = {
      left: withTiming(l.x, { duration: 220, easing: Easing.out(Easing.cubic) }),
      width: withTiming(l.w, { duration: 220, easing: Easing.out(Easing.cubic) }),
    };
  };

  const onTabLayout = (k: JournalFilter, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.set(k, { x, w: width });
    if (k === value) {
      indicator.value = { left: x, width };
    }
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicator.value.left as number,
    width: indicator.value.width as number,
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: C.line,
        marginBottom: 16,
        position: 'relative',
      }}
    >
      {tabs.map((t) => (
        <Pressable
          key={t.k}
          onLayout={(e) => onTabLayout(t.k, e)}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(t.k);
            updateIndicator(t.k);
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            marginBottom: -1,
          }}
        >
          <Text
            style={{
              color: value === t.k ? C.journal : C.fog,
              fontFamily: F.bodyBold,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {t.label}
          </Text>
        </Pressable>
      ))}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -1,
            height: 2,
            backgroundColor: C.journal,
            borderRadius: 1,
          },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

function EmptyJournal() {
  const { C, F } = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/sheets/new-entry')}
      style={{
        marginTop: 4,
        padding: 22,
        borderRadius: 22,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: C.line,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Icon name="feather" size={22} color={C.fog} />
      <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
        No entries yet
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: C.fog,
          fontFamily: F.body,
          textAlign: 'center',
        }}
      >
        Write something small. Even a sentence counts.
      </Text>
    </Pressable>
  );
}

function EmptyFiltered() {
  const { C, F } = useTheme();
  return (
    <View
      style={{
        marginTop: 6,
        padding: 18,
        borderRadius: 22,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: C.line,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 12, color: C.fog, fontFamily: F.body }}>
        Nothing here yet.
      </Text>
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
          height: 148,
          borderRadius: 22,
          backgroundColor: C.butter,
          opacity: 0.35,
          marginBottom: 16,
        }}
      />
      <Animated.View
        entering={FadeIn.delay(60).duration(300)}
        style={{
          height: 42,
          borderBottomWidth: 1,
          borderBottomColor: C.line,
          marginBottom: 16,
        }}
      />
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(100 + i * 60).duration(300)}
          style={{
            height: 82,
            borderRadius: 18,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            marginBottom: 12,
            opacity: 0.55,
          }}
        />
      ))}
    </Screen>
  );
}
