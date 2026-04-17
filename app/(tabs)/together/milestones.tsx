import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
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
import { togetherItemContainerStyle, togetherListContainerStyle } from '@/src/constants/togetherStyles';

type MilestoneItem = {
  id: string;
  title: string;
  date: string;
  description?: string | null;
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
        await update(editingMilestone.id, data);
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
            await remove(item.id);
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
              key={item.id}
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
                <View style={[styles.accentRail, { backgroundColor: C.dim }]} />
                <View style={[styles.iconRing, { backgroundColor: C.milestonesLight }]}>
                  <Text style={styles.iconEmoji}>{item.icon || '\u2B50'}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.kickerText, { color: C.textTertiary }]}>
                    {formatDate(item.date)}
                  </Text>
                  <Text style={[styles.cardTitle, { color: C.textSecondary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.milestones} />
            }
          >
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
          </ScrollView>

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
              id: editingMilestone.id,
              title: editingMilestone.title,
              date: editingMilestone.date,
              description: editingMilestone.description ?? null,
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
        {filteredUpcoming.length === 0 && filteredPast.length === 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.milestones} />
            }
          >
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
                title="No milestones on this date"
                description="Pick another day or clear the date filter."
              />
            </View>
          </ScrollView>
        ) : (
          <FlashList
            data={filteredUpcoming}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              togetherListContainerStyle,
            ]}
            ListHeaderComponent={
              <>
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
                {headerComponent}
              </>
            }
            ListFooterComponent={footerComponent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
            }
            ItemSeparatorComponent={() => (
              <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 71, backgroundColor: C.dim }} />
            )}
            renderItem={({ item, index }) => {
            const days = getDaysUntil(item.date);
            const row = (
              <TouchableOpacity
                activeOpacity={0.85}
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
                <View style={[styles.accentRail, { backgroundColor: days <= 7 ? C.milestonesLight : C.dim }]} />
                <View style={[styles.iconRing, { backgroundColor: C.milestonesLight }]}>
                  <Text style={styles.iconEmoji}>{item.icon || '\u2B50'}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.kickerText, { color: days <= 7 ? C.milestones : C.textTertiary }]}>
                    {getCountdownLabel(days)} · {formatDate(item.date)}
                  </Text>
                  <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={[styles.cardNote, { color: C.textTertiary }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );

            return (
              <Swipeable
                renderLeftActions={renderEditAction(item)}
                renderRightActions={renderDeleteAction(item)}
                overshootLeft={false}
                overshootRight={false}
                friction={2}
              >
                {row}
              </Swipeable>
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
            id: editingMilestone.id,
            title: editingMilestone.title,
            date: editingMilestone.date,
            description: editingMilestone.description ?? null,
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
    paddingTop: Spacing['2xl'],
    justifyContent: 'center',
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
    gap: Spacing.md,
    minHeight: 56,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  pastCard: {},
  iconRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 11,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  kickerText: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardTitle: {
    ...Typography.bodyMedium,
  },
  cardNote: {
    ...Typography.small,
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
