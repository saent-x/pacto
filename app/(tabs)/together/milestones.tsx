import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '@/src/hooks/useColors';
import { useMilestones } from '@/src/hooks/useMilestones';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { MiniDateRail } from '@/src/components/calendar/MiniDateRail';
import { EmptyState } from '@/src/components/ui';
import { CreateMilestoneSheet } from '@/src/components/milestones/CreateMilestoneSheet';
import { matchesSelectedDate } from '@/src/lib/togetherDateFilter';
import { togetherItemContainerStyle, togetherListContainerStyle } from './_itemStyles';

type MilestoneItem = {
  _id: string;
  title: string;
  date: string;
  description: string | null;
  icon: string;
  createdBy: string;
  createdAt: number;
};

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getCountdownLabel(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days away`;
}

export default function MilestonesScreen() {
  const C = useColors();
  const router = useRouter();
  const { upcoming, past, create, update, remove, refetch } = useMilestones();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneItem | undefined>();
  const filteredUpcoming = upcoming.filter((item) =>
    matchesSelectedDate(item.date, selectedDate),
  );
  const filteredPast = past.filter((item) =>
    matchesSelectedDate(item.date, selectedDate),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleCreate = useCallback(
    async (data: { title: string; date: string; description: string | null; icon: string }) => {
      if (editingMilestone) {
        await update(editingMilestone._id, data);
        setEditingMilestone(undefined);
        return;
      }
      await create(data);
    },
    [create, editingMilestone, update],
  );

  const handleDelete = useCallback(
    (item: MilestoneItem) => {
      Alert.alert('Delete milestone', `Remove "${item.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await remove(item._id);
          },
        },
      ]);
    },
    [remove],
  );

  const renderEditAction = useCallback(
    (item: MilestoneItem) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.primary }]}
        onPress={() => {
          setEditingMilestone(item);
          sheetRef.current?.present();
        }}
      >
        <Feather name="edit-3" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.primary],
  );

  const renderDeleteAction = useCallback(
    (item: MilestoneItem) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.error }]}
        onPress={() => handleDelete(item)}
      >
        <Feather name="trash-2" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.error, handleDelete],
  );

  const headerComponent = (
    <View>
      {filteredUpcoming.length > 0 && (
        <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>UPCOMING</Text>
      )}
    </View>
  );

  const footerComponent = (
    <View>
      {filteredPast.length > 0 && (
        <View style={styles.pastSection}>
          <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
            PAST ({filteredPast.length})
          </Text>

          {filteredPast.map((item, i) => (
            <Animated.View
              key={item._id}
              entering={FadeInDown.duration(300).delay(i * 50)}
            >
              <View
                style={[
                  togetherItemContainerStyle,
                  styles.milestoneCard,
                  styles.pastCard,
                  { backgroundColor: C.card, opacity: 0.65 },
                ]}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.iconRing, { backgroundColor: C.milestonesLight }]}>
                    <Text style={styles.iconEmoji}>{item.icon || '\u2B50'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: C.textSecondary }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardMeta, { color: C.textTertiary }]}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      <View style={{ height: 120 }} />
    </View>
  );

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <MiniDateRail
            title="Milestones"
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            accentColor={C.milestones}
            onPressLeading={() => {
              Haptics.selectionAsync();
              router.replace("/(tabs)/together");
            }}
          />

          <View style={styles.emptyWrap}>
            <EmptyState
              title="No milestones yet"
              description="Mark the moments that matter"
            />
          </View>

          {/* FAB */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEditingMilestone(undefined);
              sheetRef.current?.present();
            }}
            activeOpacity={0.85}
            style={[styles.floatingFab, { backgroundColor: C.milestones }]}
          >
            <Feather name="plus" size={22} color={C.ink} />
          </TouchableOpacity>

          <CreateMilestoneSheet
            sheetRef={sheetRef}
            onSave={handleCreate}
            milestone={editingMilestone ? {
              id: editingMilestone._id,
              title: editingMilestone.title,
              date: editingMilestone.date,
              description: editingMilestone.description,
              icon: editingMilestone.icon,
            } : undefined}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <MiniDateRail
          title="Milestones"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          accentColor={C.milestones}
          onPressLeading={() => {
            Haptics.selectionAsync();
            router.replace("/(tabs)/together");
          }}
        />

        {filteredUpcoming.length === 0 && filteredPast.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              title="No milestones on this date"
              description="Pick another day or clear the date filter."
            />
          </View>
        ) : (
          <FlashList
            data={filteredUpcoming}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              styles.listContent,
              togetherListContainerStyle,
            ]}
            ListHeaderComponent={headerComponent}
            ListFooterComponent={footerComponent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
            }
            renderItem={({ item, index }) => {
            const days = getDaysUntil(item.date);
            const row = (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setEditingMilestone(item);
                  sheetRef.current?.present();
                }}
                style={[
                  togetherItemContainerStyle,
                  styles.milestoneCard,
                  { backgroundColor: C.card },
                ]}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.iconRing, { backgroundColor: C.milestonesLight }]}>
                    <Text style={styles.iconEmoji}>{item.icon || '\u2B50'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardMeta, { color: C.textTertiary }]}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                </View>
                <View style={styles.countdown}>
                  <Text
                    style={[
                      styles.countdownText,
                      { color: days <= 7 ? C.milestones : C.textTertiary },
                    ]}
                  >
                    {getCountdownLabel(days)}
                  </Text>
                </View>
              </TouchableOpacity>
            );

            return (
              <Animated.View key={item._id} entering={FadeInDown.duration(400).delay(150 + index * 60)} style={{ marginBottom: Spacing.sm }}>
                <Swipeable
                  renderLeftActions={renderEditAction(item)}
                  renderRightActions={renderDeleteAction(item)}
                  overshootLeft={false}
                  overshootRight={false}
                  friction={2}
                >
                  {row}
                </Swipeable>
              </Animated.View>
            );
            }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEditingMilestone(undefined);
            sheetRef.current?.present();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.milestones }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateMilestoneSheet
          sheetRef={sheetRef}
          onSave={handleCreate}
          milestone={editingMilestone ? {
            id: editingMilestone._id,
            title: editingMilestone.title,
            date: editingMilestone.date,
            description: editingMilestone.description,
            icon: editingMilestone.icon,
          } : undefined}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  listContent: {
    paddingBottom: 120,
  },
  emptyWrap: {
    paddingHorizontal: Spacing['2xl'],
    height: 400,
  },

  // Section labels
  sectionLabel: {
    ...Typography.overline,
    letterSpacing: 2,
    paddingHorizontal: Spacing['2xl'],
    marginVertical: Spacing.md,
  },

  // Milestone card
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  pastCard: {
    marginBottom: Spacing.xs,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.bodyMedium,
    marginBottom: 2,
  },
  cardMeta: {
    ...Typography.small,
  },
  countdown: {
    alignItems: 'flex-end',
  },
  countdownText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },

  // Past section
  pastSection: {
    marginTop: Spacing.lg,
  },
  swipeAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingFab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
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
