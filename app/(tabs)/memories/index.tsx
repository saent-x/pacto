import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarPair, CrewStack } from '@/src/components/ui/pacto';
import { ComposerRail } from '@/src/components/ui/pacto/memories/ComposerRail';
import { EmptyMemoriesState } from '@/src/components/ui/pacto/memories/EmptyMemoriesState';
import { MemoriesHero } from '@/src/components/ui/pacto/memories/MemoriesHero';
import { MemoryPost } from '@/src/components/ui/pacto/memories/MemoryPost';
import { TopicChipStrip } from '@/src/components/ui/pacto/memories/TopicChipStrip';
import { useMemoriesFeed } from '@/src/hooks/memories/useMemoriesFeed';
import { useMemoryTopics } from '@/src/hooks/memories/useMemoryTopics';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const session = useSession() as any;
  const me = session?.user;
  const partner = session?.partner;
  const mode: 'solo' | 'pair' | 'couple' | 'crew' =
    session?.mode ?? session?.space?.kind ?? 'solo';
  const isSolo = mode === 'solo';
  const spaceId = session?.activeCouple?.couple?.id ?? session?.space?.id;

  const [topic, setTopic] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { topics } = useMemoryTopics(spaceId, me?.id);
  const { memories } = useMemoriesFeed(topic, spaceId, me?.id);

  // ── Hero copy adapts to the mode ───────────────────────────────────────
  const meName = (me?.displayName ?? me?.email?.split('@')[0] ?? 'You')
    .toString()
    .charAt(0)
    .toUpperCase();
  const partnerInitial = partner?.displayName?.charAt(0)?.toUpperCase();
  const crewMemberCount = session?.activeCouple?.couple?.memberCount ?? 4;

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

  const heroCaption = isSolo
    ? "a private timeline for the small things you don't want to forget"
    : mode === 'crew'
    ? 'one thread, every voice, all the small stuff'
    : 'small things, one shared thread, just for the two of you';

  const heroRightSlot = isSolo ? (
    <Avatar
      person={{ initial: meName, color: C.accent, avatarUrl: me?.avatarUrl }}
      size={48}
    />
  ) : mode === 'crew' ? (
    <CrewStack size={40} />
  ) : (
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

  // Solo hides the "Just us" topic chip (no second author)
  const visibleTopics = isSolo ? topics.filter((t) => t.id !== 'us') : topics;

  return (
    <FlatList
      style={[styles.root, { backgroundColor: C.bg }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      data={memories}
      keyExtractor={(m: any) => m.id}
      renderItem={({ item, index }) => (
        <MemoryPost
          memory={item as any}
          variant="feed"
          isLast={index === memories.length - 1}
        />
      )}
      ListHeaderComponent={
        <View>
          <MemoriesHero
            eyebrow={eyebrow}
            title={heroTitle}
            caption={heroCaption}
            rightSlot={heroRightSlot}
          />

          <TopicChipStrip
            topics={visibleTopics}
            selected={topic}
            onSelect={setTopic}
          />

          <ComposerRail
            meDisplayName={me?.displayName ?? me?.email}
            meAvatarUrl={me?.avatarUrl}
            isSolo={isSolo}
          />

          <View style={[styles.divider, { backgroundColor: C.lineColor }]} />
        </View>
      }
      ListEmptyComponent={<EmptyMemoriesState />}
      ListFooterComponent={
        memories.length > 0 ? (
          <Text style={[styles.footerCap, { color: C.ink3 }]}>
            — caught up · {memories.length} {memories.length === 1 ? 'memory' : 'memories'} —
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  footerCap: {
    textAlign: 'center',
    paddingVertical: 24,
    fontFamily: 'GeistMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
