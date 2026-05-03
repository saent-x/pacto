import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useMemoriesFeed, type FeedTab } from '@/src/hooks/memories/useMemoriesFeed';
import { MemoryCard } from '@/src/components/ui/pacto/memories/MemoryCard';
import { EmptyMemoriesState } from '@/src/components/ui/pacto/memories/EmptyMemoriesState';

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const session = useSession() as any;
  const userId = session?.user?.id;
  const mode = session?.mode ?? session?.space?.kind ?? 'solo';
  const spaceId = session?.activeCouple?.couple?.id ?? session?.space?.id;
  const [tab, setTab] = useState<FeedTab>('recent');
  const [refreshing, setRefreshing] = useState(false);

  const tabs: FeedTab[] = mode === 'solo' ? ['recent', 'highlights'] : ['recent', 'highlights', 'private'];
  const labels: Record<FeedTab, string> = { recent: 'Recent', highlights: 'Highlights', private: 'Private' };

  const { memories } = useMemoriesFeed(tab, spaceId, userId);

  return (
    <View style={[styles.root, { backgroundColor: C.bg, paddingTop: insets.top + 80 }]}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SegmentedControl
          segments={tabs.map((t) => ({ value: t, label: labels[t] }))}
          selected={tab}
          onSelect={(v) => setTab(v as FeedTab)}
        />
      </View>
      <FlatList
        data={memories}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MemoryCard memory={item as any} variant="feed" />}
        ListEmptyComponent={<EmptyMemoriesState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 600);
            }}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
