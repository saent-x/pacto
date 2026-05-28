import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarPair, CrewStack } from '@/src/components/ui/pacto';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { EmptyMemoriesState } from '@/src/components/ui/pacto/memories/EmptyMemoriesState';
import { MemoriesHero } from '@/src/components/ui/pacto/memories/MemoriesHero';
import { MemoryPost } from '@/src/components/ui/pacto/memories/MemoryPost';
import { TopicChipStrip } from '@/src/components/ui/pacto/memories/TopicChipStrip';
import { Typography } from '@/src/constants/typography';
import { useMemoriesFeed } from '@/src/hooks/memories/useMemoriesFeed';
import { useMemoryTopics } from '@/src/hooks/memories/useMemoryTopics';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import { uniqueSpaceIds } from '@/src/lib/space-scope';

const COLLAPSE_THRESHOLD = 28;

// Memoized so feed rows don't re-render when unrelated screen state (e.g. the
// collapsing-header animation toggling `headerCompact`) changes. Props are
// primitives/stable refs so the memo holds.
const FeedRow = React.memo(function FeedRow({
  memory,
  isLast,
}: {
  memory: any;
  isLast: boolean;
}) {
  return <MemoryPost memory={memory} variant="feed" isLast={isLast} />;
});

export default function MemoriesScreen() {
  return (
    <FeatureRouteGuard featureId="memoryFeed">
      <MemoriesScreenInner />
    </FeatureRouteGuard>
  );
}

function MemoriesScreenInner() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const session = useSession() as any;
  const me = session?.user;
  const partner = session?.partner;
  const mode: 'solo' | 'pair' | 'couple' | 'crew' =
    session?.mode ?? session?.space?.kind ?? 'solo';
  const isSolo = mode === 'solo';
  const spaceId = session?.activeCouple?.couple?.id ?? session?.space?.id;
  const rawPersonalSpaceId = session?.personalSpaceId ?? spaceId;
  const rawSharedSpaceId = session?.sharedSpaceId ?? spaceId;
  const feedSpaceIds = useMemo(
    () => uniqueSpaceIds([rawPersonalSpaceId, rawSharedSpaceId]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawPersonalSpaceId, rawSharedSpaceId],
  );

  const [topic, setTopic] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [headerCompact, setHeaderCompact] = useState(false);
  const headerProgress = useRef(new Animated.Value(0)).current;

  const { topics } = useMemoryTopics(feedSpaceIds, me?.id, session?.personalSpaceId ?? null);
  const { memories } = useMemoriesFeed(topic, feedSpaceIds, me?.id, session?.personalSpaceId ?? null);

  // ── Hero copy adapts to the mode ───────────────────────────────────────
  const meName = useMemo(
    () =>
      (me?.displayName ?? me?.email?.split('@')[0] ?? 'You')
        .toString()
        .charAt(0)
        .toUpperCase(),
    [me?.displayName, me?.email],
  );
  const partnerInitial = partner?.displayName?.charAt(0)?.toUpperCase();
  const crewMemberCount = session?.activeCouple?.memberCount ?? 1;

  const eyebrow = isSolo
    ? 'YOUR MEMORIES'
    : mode === 'crew'
    ? `CREW MEMORIES · ${crewMemberCount} AUTHORS`
    : `SHARED MEMORIES${partnerInitial ? ` · ${meName} & ${partnerInitial}` : ''}`;

  const heroTitle = isSolo
    ? 'Field notes'
    : mode === 'crew'
    ? 'House journal'
    : 'A long quiet thread';

  const heroRightSlot = useMemo(() => {
    if (isSolo) {
      return (
        <Avatar
          person={{ initial: meName, color: C.accent, avatarUrl: me?.avatarUrl }}
          size={48}
        />
      );
    }
    if (mode === 'crew') {
      return <CrewStack size={40} />;
    }
    return (
      <AvatarPair
        a={{ initial: meName, color: C.accent, avatarUrl: me?.avatarUrl }}
        b={{
          initial: partnerInitial ?? 'P',
          color: C.accent2,
          avatarUrl: partner?.avatarUrl,
        }}
        size={44}
      />
    );
  }, [isSolo, mode, meName, C.accent, C.accent2, me?.avatarUrl, partnerInitial, partner?.avatarUrl]);

  const compactRightSlot = useMemo(() => {
    if (isSolo) {
      return (
        <Avatar
          person={{ initial: meName, color: C.accent, avatarUrl: me?.avatarUrl }}
          size={32}
        />
      );
    }
    if (mode === 'crew') {
      return <CrewStack size={30} />;
    }
    return (
      <AvatarPair
        a={{ initial: meName, color: C.accent, avatarUrl: me?.avatarUrl }}
        b={{
          initial: partnerInitial ?? 'P',
          color: C.accent2,
          avatarUrl: partner?.avatarUrl,
        }}
        size={32}
      />
    );
  }, [isSolo, mode, meName, C.accent, C.accent2, me?.avatarUrl, partnerInitial, partner?.avatarUrl]);

  // Solo hides the "Just us" topic chip (no second author)
  const visibleTopics = useMemo(
    () => (isSolo ? topics.filter((t) => t.id !== 'us') : topics),
    [isSolo, topics],
  );
  const headerFullHeight = insets.top + 204;
  const headerCompactHeight = insets.top + 126;
  const headerHeight = headerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [headerFullHeight, headerCompactHeight],
  });
  const fullHeaderStyle = {
    opacity: headerProgress.interpolate({
      inputRange: [0, 0.72, 1],
      outputRange: [1, 0, 0],
    }),
    transform: [
      {
        translateY: headerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
      {
        scale: headerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.98],
        }),
      },
    ],
  };
  const compactHeaderStyle = {
    opacity: headerProgress.interpolate({
      inputRange: [0, 0.36, 1],
      outputRange: [0, 0, 1],
    }),
    transform: [
      {
        translateY: headerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  useEffect(() => {
    Animated.timing(headerProgress, {
      toValue: headerCompact ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [headerCompact, headerProgress]);

  const onFeedScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextCompact = event.nativeEvent.contentOffset.y > COLLAPSE_THRESHOLD;
    setHeaderCompact((current) => (current === nextCompact ? current : nextCompact));
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg, flex: 1 }]}>
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            backgroundColor: C.bg,
            borderBottomColor: C.lineColor,
            height: headerHeight,
          },
        ]}
      >
        <Animated.View
          testID="memories-header-full"
          style={[
            styles.headerLayer,
            { paddingTop: insets.top + 56 },
            { pointerEvents: headerCompact ? 'none' : 'auto' },
            fullHeaderStyle,
          ]}
        >
          <MemoriesHero
            eyebrow={eyebrow}
            title={heroTitle}
            rightSlot={heroRightSlot}
          />
          <TopicChipStrip
            topics={visibleTopics}
            selected={topic}
            onSelect={setTopic}
          />
        </Animated.View>
        <Animated.View
          testID="memories-header-compact"
          style={[
            styles.headerLayer,
            { paddingTop: insets.top + 44 },
            { pointerEvents: headerCompact ? 'auto' : 'none' },
            compactHeaderStyle,
          ]}
        >
          <View style={styles.compactHeroRow}>
            <View style={styles.compactText}>
              <Text style={[styles.compactEyebrow, { color: C.accent }]} numberOfLines={1}>
                {eyebrow}
              </Text>
              <Text style={[styles.compactTitle, { color: C.inkColor }]} numberOfLines={1}>
                {heroTitle}
              </Text>
            </View>
            <View style={styles.compactRight}>{compactRightSlot}</View>
          </View>
          <TopicChipStrip
            compact
            topics={visibleTopics}
            selected={topic}
            onSelect={setTopic}
          />
        </Animated.View>
      </Animated.View>
      <FlashList
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 56,
        }}
        data={memories}
        onScroll={onFeedScroll}
        scrollEventThrottle={16}
        keyExtractor={(m: any) => m.id}
        renderItem={({ item, index }) => (
          <FeedRow memory={item} isLast={index === memories.length - 1} />
        )}
        ListEmptyComponent={<EmptyMemoriesState />}
        ListFooterComponent={
          memories.length > 0 ? (
            <Text style={[styles.footerCap, { color: C.ink3 }]}>
              caught up · {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
            </Text>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 600);
            }}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fixedHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 10,
  },
  headerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  compactHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  compactText: {
    flex: 1,
    minWidth: 0,
  },
  compactEyebrow: {
    ...Typography.eyebrowSm,
  },
  compactTitle: {
    marginTop: 2,
    fontFamily: Typography.pixelFont,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  compactRight: {
    flexShrink: 0,
  },
  footerCap: {
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 10,
    fontFamily: 'GeistMono_500Medium',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
