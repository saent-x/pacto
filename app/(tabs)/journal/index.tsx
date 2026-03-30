import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { format } from 'date-fns';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useJournal, JournalFilter } from '@/src/hooks/useJournal';
import { useSwipeTabs } from '@/src/hooks/useSwipeTabs';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { MiniDateRail } from '@/src/components/calendar/MiniDateRail';
import { EmptyState } from '@/src/components/ui';
import { CreateEntrySheet } from '@/src/components/journal/CreateEntrySheet';
import { MarkdownText } from '@/src/components/journal/MarkdownText';
import { JournalEntry } from '@/src/types/database';

const MOOD_ICONS: Record<string, { icon: string; color: string }> = {
  sun: { icon: 'sun', color: '#8AAF7B' },
  cloud: { icon: 'cloud', color: '#7BA0AF' },
  minus: { icon: 'minus', color: '#D4A054' },
  'cloud-drizzle': { icon: 'cloud-drizzle', color: '#B08090' },
  'cloud-lightning': { icon: 'cloud-lightning', color: '#C96B5A' },
};

export default function JournalScreen() {
  const C = useColors();
  const router = useRouter();
  const { profile } = useSession();
  const userId = profile?._id ?? null;
  const { entries, isLoading, filter, setFilter, create, update, remove, refetch, uploadJournalImage } = useJournal();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const visibleEntries = selectedDate
    ? entries.filter((entry) => entry.entry_date === selectedDate)
    : entries;
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  const tabSwipe = useSwipeTabs({
    tabs: ['all', 'shared', 'private'] as const,
    value: filter,
    onChange: (next) => setFilter(next as JournalFilter),
  });

  const handleSave = async (data: any) => {
    await create(data);
  };

  const openCreate = () => {
    sheetRef.current?.present();
  };

  const openEntry = (entry: JournalEntry) => {
    // Navigate to full-screen detail view
    router.push(`/(tabs)/journal/${entry.id}` as any);
  };

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const isOwn = item.author_id === userId;
    const moodInfo = item.mood ? MOOD_ICONS[item.mood] : null;

    const handleDelete = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Delete entry', 'Remove this journal entry?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(item.id) },
      ]);
    };

    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <Swipeable
          renderRightActions={() => (
            <TouchableOpacity
              style={[styles.swipeAction, { backgroundColor: C.error }]}
              onPress={handleDelete}
            >
              <Feather name="trash-2" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          renderLeftActions={() => (
            <TouchableOpacity
              style={[styles.swipeAction, { backgroundColor: C.journal }]}
              onPress={() => openEntry(item)}
            >
              <Feather name="edit-3" size={18} color={C.ink} />
            </TouchableOpacity>
          )}
          overshootRight={false}
          overshootLeft={false}
          friction={2}
        >
          <TouchableOpacity
            style={[styles.entryCard, { backgroundColor: C.card, borderColor: C.border }]}
            activeOpacity={0.85}
            onPress={() => openEntry(item)}
          >
          {/* Left accent for partner entries */}
          {!isOwn && <View style={[styles.partnerBar, { backgroundColor: C.primary }]} />}

          <View style={styles.entryContent}>
            {/* Meta row */}
            <View style={styles.entryMeta}>
              <Text style={[styles.entryDate, { color: C.textTertiary }]}>
                {format(new Date(item.entry_date + 'T00:00:00'), 'MMM d, yyyy')}
              </Text>
              {item.is_private && (
                <Feather name="lock" size={11} color={C.fog} />
              )}
            </View>

            {/* Title */}
            {item.title && (
              <Text style={[styles.entryTitle, { color: C.text }]} numberOfLines={1}>
                {item.title}
              </Text>
            )}

            {/* Body preview */}
            <MarkdownText value={item.body} numberOfLines={2} />

            {/* Bottom row */}
            <View style={styles.entryFooter}>
              {moodInfo && (
                <View style={[styles.moodBadge, { backgroundColor: moodInfo.color + '15' }]}>
                  <Feather name={moodInfo.icon as any} size={11} color={moodInfo.color} />
                </View>
              )}
              {!isOwn && (
                <Text style={[styles.authorLabel, { color: C.textTertiary }]}>Partner</Text>
              )}
            </View>
          </View>

          {item.media_urls[0] ? (
            <View style={styles.entryMediaWrap}>
              <Image source={{ uri: item.media_urls[0] }} style={styles.entryMedia} />
            </View>
          ) : null}
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    );
  };

  const hasEntries = visibleEntries.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={[styles.flex, { backgroundColor: C.surface }]} edges={['top']}>
        <MiniDateRail
          title="Journal"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          accentColor={C.journal}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'shared', label: 'Shared' },
            { value: 'private', label: 'Private' },
          ]}
          selectedTab={filter}
          onSelectTab={(value) => setFilter(value as JournalFilter)}
        />
        {!hasEntries && !isLoading ? (
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.journal} />
            }
            showsVerticalScrollIndicator={false}
            {...tabSwipe.panHandlers}
          >
            <EmptyState
              icon="book-open"
              title="Your journal is empty"
              description="Write together or keep a private journal just for you."
              actionLabel="Write Entry"
              onAction={openCreate}
            />
          </ScrollView>
        ) : (
          <FlashList
            data={visibleEntries}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.journal} />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            {...tabSwipe.panHandlers}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openCreate();
          }}
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: C.journal }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateEntrySheet
          sheetRef={sheetRef}
          onSave={handleSave}
          onUploadImage={uploadJournalImage}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  header: {
    paddingBottom: 0,
  },

  listContent: {
    paddingTop: Spacing.xl,
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 27,
    marginRight: Spacing['2xl'],
  },

  entryCard: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingRight: Spacing['2xl'],
  },
  partnerBar: {
    width: 3,
  },
  entryContent: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: Spacing.xl,
  },
  entryMediaWrap: {
    paddingVertical: 14,
    justifyContent: 'center',
  },
  entryMedia: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  entryDate: {
    ...Typography.overline,
    fontSize: 10,
  },
  entryTitle: {
    ...Typography.bodyMedium,
    marginBottom: Spacing.xs,
  },
  entryBody: {
    ...Typography.small,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  moodBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorLabel: {
    ...Typography.small,
  },
  swipeAction: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing['2xl'],
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
