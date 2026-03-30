import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useColors } from '@/src/hooks/useColors';
import { useMilestones } from '@/src/hooks/useMilestones';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { CreateMilestoneSheet } from '@/src/components/milestones/CreateMilestoneSheet';

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
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
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
  const { upcoming, past, isLoading, create, refetch } = useMilestones();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      await create(data);
    },
    [create],
  );

  const headerComponent = (
    <View>
      {upcoming.length > 0 && (
        <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>UPCOMING</Text>
      )}
    </View>
  );

  const footerComponent = (
    <View>
      {past.length > 0 && (
        <View style={styles.pastSection}>
          <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
            PAST ({past.length})
          </Text>

          {past.map((item, i) => (
            <Animated.View
              key={item._id}
              entering={FadeInDown.duration(300).delay(i * 50)}
            >
              <View
                style={[
                  styles.milestoneCard,
                  styles.pastCard,
                  { backgroundColor: C.card, borderColor: C.border, opacity: 0.65 },
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

  if (!isLoading && upcoming.length === 0 && past.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: C.background }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: C.text }]}>Milestones</Text>
            <View style={{ width: 40 }} />
          </View>

          <EmptyState
            icon="flag"
            title="No milestones yet"
            description="Mark the moments that matter"
            actionLabel="Add Milestone"
            onAction={() => sheetRef.current?.present()}
          />

          {/* FAB */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              sheetRef.current?.present();
            }}
            activeOpacity={0.85}
            style={[styles.floatingFab, { backgroundColor: C.milestones }]}
          >
            <Feather name="plus" size={22} color={C.ink} />
          </TouchableOpacity>

          <CreateMilestoneSheet sheetRef={sheetRef} onSave={handleCreate} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Milestones</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlashList
          data={upcoming}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={headerComponent}
          ListFooterComponent={footerComponent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
          renderItem={({ item, index }) => {
            const days = getDaysUntil(item.date);
            return (
              <Animated.View entering={FadeInDown.duration(400).delay(150 + index * 60)}>
                <View
                  style={[
                    styles.milestoneCard,
                    { backgroundColor: C.card, borderColor: C.border },
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
                </View>
              </Animated.View>
            );
          }}
        />

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            sheetRef.current?.present();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.milestones }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateMilestoneSheet sheetRef={sheetRef} onSave={handleCreate} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 20,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },

  // Section labels
  sectionLabel: {
    ...Typography.overline,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },

  // Milestone card
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
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
