import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import {
  Avatar,
  AvatarPair,
  CrewStack,
  HeaderBrand,
  PulsingDot,
  SegmentedTabs,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useLoveNotes } from '@/src/hooks/useLoveNotes';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type Bubble = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  authorAvatarUrl: string | null;
  isMine: boolean;
  createdAt: number;
};

type StreamItem =
  | { kind: 'bubble'; data: Bubble }
  | { kind: 'divider'; id: string; label: string };

export default function NotesScreen() {
  return (
    <FeatureRouteGuard featureId="memories">
      <NotesScreenInner />
    </FeatureRouteGuard>
  );
}

function NotesScreenInner() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, partner, mode, members } = useSession();
  const { notes, isLoading, create } = useLoveNotes();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'theirs' | 'today'>('all');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKbOpen(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbOpen(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const userId = user?.id ?? '';
  const myName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'You').split(' ')[0];
  const myInitial = myName.charAt(0).toUpperCase();

  // Color palette for chat participants — covers solo/pair/crew.
  const participantColor = (authorId: string): string => {
    if (authorId === userId) return C.accent;
    const idx = members.findIndex((m) => m.id === authorId);
    if (idx === -1) return C.accent2;
    return [C.accent2, C.accent3, C.lavender, C.sky][idx % 4];
  };

  const participantName = (authorId: string): string => {
    if (authorId === userId) return myName;
    const m = members.find((x) => x.id === authorId);
    return m?.displayName?.split(' ')[0] ?? 'Member';
  };

  const participantAvatarUrl = (authorId: string): string | null => {
    if (authorId === userId) return user?.avatarUrl ?? null;
    const m = members.find((x) => x.id === authorId);
    return m?.avatarUrl ?? null;
  };

  const stream = useMemo<StreamItem[]>(() => {
    const todayMs = startOfDay(new Date()).getTime();
    const sorted = [...notes]
      .filter((n) => {
        const authorId = (n as any).authorId as string;
        const createdAt = Number((n as any).createdAt ?? 0);
        if (filter === 'mine') return authorId === userId;
        if (filter === 'theirs') return authorId !== userId;
        if (filter === 'today') return createdAt >= todayMs;
        return true;
      })
      .sort(
        (a, b) =>
          Number((a as any).createdAt ?? 0) - Number((b as any).createdAt ?? 0)
      );
    const out: StreamItem[] = [];
    let lastDayKey: string | null = null;
    for (const n of sorted) {
      const id = (n as any).id as string;
      const body = (n as any).body ?? '';
      const authorId = (n as any).authorId as string;
      const createdAt = Number((n as any).createdAt ?? 0);
      const dayKey = startOfDay(new Date(createdAt)).toISOString();
      if (dayKey !== lastDayKey) {
        const d = new Date(createdAt);
        const label = isToday(d)
          ? 'Today'
          : isYesterday(d)
          ? 'Yesterday'
          : format(d, 'EEE · MMM d');
        out.push({ kind: 'divider', id: `div-${dayKey}`, label });
        lastDayKey = dayKey;
      }
      out.push({
        kind: 'bubble',
        data: {
          id,
          body,
          authorId,
          authorName: participantName(authorId),
          authorColor: participantColor(authorId),
          authorAvatarUrl: participantAvatarUrl(authorId),
          isMine: authorId === userId,
          createdAt,
        },
      });
    }
    return out;
  }, [notes, userId, members, filter]);

  // Auto-scroll to bottom when content changes.
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [stream.length]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined
      );
      await create({ body });
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const eyebrowLabel =
    mode === 'solo'
      ? 'ME · NOTES'
      : mode === 'crew'
      ? 'CREW · NOTES'
      : 'US · NOTES';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          headerTintColor: C.inkColor,
          title: '',
          headerTitleAlign: 'center',
          headerTitle: () => <HeaderBrand eyebrow={eyebrowLabel} title="notes" />,
          headerLeft: () => (
            <PressScale
              onPress={() => router.back()}
              hitSlop={12}
              haptic="impact"
              pressedScale={0.96}
              style={{ padding: 4 }}
            >
              <Icon
                name="chevronLeft"
                size={22}
                color={C.inkColor}
                strokeWidth={2.2}
              />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              onPress={() => router.push('/sheets/profile' as any)}
              haptic="impact"
              pressedScale={0.96}
              style={{ flexDirection: 'row' }}
            >
              {mode === 'solo' ? (
                <Avatar
                  person={{
                    initial: myInitial,
                    color: C.accent,
                    avatarUrl: user?.avatarUrl,
                  }}
                  size={30}
                />
              ) : mode === 'crew' ? (
                <CrewStack size={28} />
              ) : (
                <AvatarPair
                  a={{
                    initial: myInitial,
                    color: C.accent,
                    avatarUrl: user?.avatarUrl,
                  }}
                  b={{
                    initial: (partner?.displayName ?? 'P')
                      .charAt(0)
                      .toUpperCase(),
                    color: C.accent2,
                    avatarUrl: partner?.avatarUrl,
                  }}
                  size={30}
                />
              )}
            </PressScale>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        {/* Static region: hero + filter pills (don't scroll with chat) */}
        <View style={{ paddingTop: insets.top + 56, paddingHorizontal: 14 }}>
          <ChatHero
            mode={mode}
            myName={myName}
            myInitial={myInitial}
            myAvatarUrl={user?.avatarUrl ?? null}
            partnerName={partner?.displayName ?? null}
            partnerAvatarUrl={partner?.avatarUrl ?? null}
            messageCount={notes.length}
            firstMessageAt={
              notes.length
                ? Math.min(
                    ...notes.map((n) => Number((n as any).createdAt ?? Date.now()))
                  )
                : null
            }
            lastMessageAt={
              notes.length
                ? Math.max(
                    ...notes.map((n) => Number((n as any).createdAt ?? 0))
                  )
                : null
            }
          />
          <View style={styles.filterRow}>
            <SegmentedTabs<FilterKey>
              value={filter}
              onChange={setFilter}
              options={filterOptions(mode).map((f) => ({
                key: f.key,
                label:
                  f.key === 'theirs' && partner?.displayName
                    ? `${partner.displayName.split(' ')[0]}'s`
                    : f.label,
              }))}
            />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: 4,
            paddingBottom: 12,
            paddingHorizontal: 14,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          {stream.length === 0 && !isLoading ? (
            <View style={styles.empty}>
              <Text style={[Typography.eyebrow, { color: C.ink3 }]}>QUIET</Text>
              <Text
                style={[
                  Typography.body,
                  {
                    color: C.ink2,
                    marginTop: 8,
                    textAlign: 'center',
                    maxWidth: 260,
                  },
                ]}
              >
                {mode === 'solo'
                  ? 'Leave yourself a thought below.'
                  : 'Send a first note. Anything goes.'}
              </Text>
            </View>
          ) : null}

          {stream.map((item) =>
            item.kind === 'divider' ? (
              <View key={item.id} style={styles.divider}>
                <View
                  style={[styles.dividerLine, { backgroundColor: C.lineColor }]}
                />
                <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                  {item.label}
                </Text>
                <View
                  style={[styles.dividerLine, { backgroundColor: C.lineColor }]}
                />
              </View>
            ) : (
              <BubbleView
                key={item.data.id}
                bubble={item.data}
                showAuthor={mode === 'crew'}
              />
            )
          )}
        </ScrollView>

        {/* Composer — floating pill, no surrounding background */}
        <View
          style={[
            styles.composer,
            {
              paddingBottom: kbOpen ? 8 : insets.bottom + 8,
            },
          ]}
        >
          <View
            style={[
              styles.composerInner,
              {
                backgroundColor: C.bgCard,
                borderColor: C.lineColor,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={
                mode === 'solo'
                  ? 'A thought…'
                  : mode === 'crew'
                  ? 'Send to the crew…'
                  : `Send to ${
                      partner?.displayName?.split(' ')[0] ?? 'them'
                    }…`
              }
              placeholderTextColor={C.ink3}
              multiline
              style={[
                styles.input,
                {
                  color: C.inkColor,
                  fontFamily: Typography.geistFont,
                },
              ]}
            />
            <PressScale
              onPress={onSend}
              disabled={!draft.trim() || sending}
              haptic="impact"
              pressedScale={0.96}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: !draft.trim() ? C.ink3 : C.accent,
                  opacity: !draft.trim() || sending ? 0.5 : 1,
                },
              ]}
            >
              <Icon name="arrowUp" size={18} color={C.bg} strokeWidth={2.6} />
            </PressScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ChatHero({
  mode,
  myName,
  myInitial,
  myAvatarUrl,
  partnerName,
  partnerAvatarUrl,
  messageCount,
  firstMessageAt,
  lastMessageAt,
}: {
  mode: 'solo' | 'pair' | 'crew';
  myName: string;
  myInitial: string;
  myAvatarUrl: string | null;
  partnerName: string | null;
  partnerAvatarUrl: string | null;
  messageCount: number;
  firstMessageAt: number | null;
  lastMessageAt: number | null;
}) {
  const { C } = useTheme();
  const partnerFirst = partnerName?.split(' ')[0] ?? null;

  const title =
    mode === 'solo'
      ? myName
      : mode === 'crew'
      ? 'crew'
      : partnerFirst
      ? `${myName.split(' ')[0]} & ${partnerFirst}`
      : myName;

  const sinceLabel = firstMessageAt
    ? `since ${format(new Date(firstMessageAt), 'MMM yy')}`
    : 'no thread yet';
  const recencyLabel = lastMessageAt
    ? isToday(new Date(lastMessageAt))
      ? 'last today'
      : isYesterday(new Date(lastMessageAt))
      ? 'last yesterday'
      : `last ${format(new Date(lastMessageAt), 'MMM d')}`
    : '';

  return (
    <View style={styles.heroOuter}>
      <View
        style={[
          styles.heroCard,
          { backgroundColor: C.bgCard, borderColor: C.lineColor },
        ]}
      >
        <View style={styles.heroLeft}>
          {mode === 'solo' ? (
            <Avatar
              person={{
                initial: myInitial,
                color: C.accent,
                avatarUrl: myAvatarUrl,
              }}
              size={48}
            />
          ) : mode === 'crew' ? (
            <CrewStack size={36} />
          ) : (
            <AvatarPair
              a={{
                initial: myInitial,
                color: C.accent,
                avatarUrl: myAvatarUrl,
              }}
              b={{
                initial: (partnerFirst ?? 'P').charAt(0).toUpperCase(),
                color: C.accent2,
                avatarUrl: partnerAvatarUrl,
              }}
              size={40}
            />
          )}
        </View>
        <View style={styles.heroBody}>
          <Text style={[Typography.eyebrowSm, { color: C.ink2, fontSize: 9.5 }]}>
            {messageCount === 1 ? '1 NOTE' : `${messageCount} NOTES`}
            {messageCount > 0 ? ` · ${sinceLabel.toUpperCase()}` : ''}
          </Text>
          <Text
            style={{
              fontFamily: Typography.pixelFont,
              fontSize: 18,
              lineHeight: 20,
              color: C.inkColor,
              marginTop: 4,
              textTransform: 'uppercase',
            }}
            numberOfLines={1}
          >
            {title}
            <PulsingDot color={C.accent} />
          </Text>
          {recencyLabel ? (
            <Text style={[Typography.mono, { color: C.ink3, fontSize: 11, marginTop: 2 }]}>
              {recencyLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type FilterKey = 'all' | 'mine' | 'theirs' | 'today';

function filterOptions(
  mode: 'solo' | 'pair' | 'crew'
): { key: FilterKey; label: string }[] {
  if (mode === 'solo') {
    return [
      { key: 'all', label: 'All' },
      { key: 'today', label: 'Today' },
    ];
  }
  return [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'Mine' },
    { key: 'theirs', label: 'Theirs' },
    { key: 'today', label: 'Today' },
  ];
}

function BubbleView({
  bubble,
  showAuthor,
}: {
  bubble: Bubble;
  showAuthor: boolean;
}) {
  const { C } = useTheme();
  const align = bubble.isMine ? 'flex-end' : 'flex-start';
  const bg = bubble.isMine ? C.accent : C.bgCard;
  const fg = bubble.isMine ? C.bg : C.inkColor;
  const radius = 18;
  const tail = bubble.isMine
    ? { borderBottomRightRadius: 6 }
    : { borderBottomLeftRadius: 6 };

  return (
    <View style={[styles.bubbleRow, { justifyContent: align }]}>
      {!bubble.isMine ? (
        <View style={{ marginRight: 8, marginTop: showAuthor ? 18 : 0 }}>
          <Avatar
            person={{
              initial: bubble.authorName.charAt(0).toUpperCase(),
              color: bubble.authorColor,
              avatarUrl: bubble.authorAvatarUrl,
            }}
            size={28}
          />
        </View>
      ) : null}
      <View style={{ maxWidth: '75%' }}>
        {showAuthor && !bubble.isMine ? (
          <Text
            style={[
              Typography.eyebrowSm,
              {
                color: bubble.authorColor,
                fontSize: 9.5,
                marginBottom: 2,
                marginLeft: 6,
              },
            ]}
          >
            {bubble.authorName.toUpperCase()}
          </Text>
        ) : null}
        <View
          style={[
            {
              backgroundColor: bg,
              borderRadius: radius,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: bubble.isMine ? 0 : 1,
              borderColor: C.lineColor,
            },
            tail,
          ]}
        >
          <Text style={[Typography.body, { color: fg }]}>
            {bubble.body || '(empty)'}
          </Text>
        </View>
        <Text
          style={[
            Typography.mono,
            {
              color: C.ink3,
              fontSize: 10,
              marginTop: 3,
              marginHorizontal: 6,
              textAlign: bubble.isMine ? 'right' : 'left',
            },
          ]}
        >
          {format(new Date(bubble.createdAt), 'h:mm a')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  heroOuter: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 20,
  },
  heroLeft: {
    flexShrink: 0,
  },
  heroBody: {
    flex: 1,
    minWidth: 0,
  },
  heroBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingTop: 6,
    paddingBottom: 14,
    gap: 6,
  },
  composer: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 22,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 120,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
