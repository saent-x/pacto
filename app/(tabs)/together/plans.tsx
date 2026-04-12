import { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { format } from "date-fns";
import { useColors } from "@/src/hooks/useColors";
import { useTheme } from "@/src/lib/theme";
import { usePlans } from "@/src/hooks/usePlans";
import { Typography } from "@/src/constants/typography";
import { Spacing, BorderRadius } from "@/src/constants/spacing";
import { MiniDateRail } from "@/src/components/calendar/MiniDateRail";
import { EmptyState } from "@/src/components/ui";
import { CreatePlanSheet } from "@/src/components/plans/CreatePlanSheet";
import { matchesSelectedDate } from "@/src/lib/togetherDateFilter";
import { togetherItemContainerStyle, togetherListContainerStyle } from "@/src/constants/togetherStyles";

interface PlanRecord {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  budget?: number | null;
  status: string;
  priority: number;
  isPrivate: boolean;
  createdAt: number;
}

const STATUS_GROUPS = [
  { key: "active", label: "Active" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On Hold" },
] as const;

const PRIORITY_CONFIG: Record<
  number,
  { label: string; icon: "minus" | "alert-circle" | "alert-triangle" }
> = {
  1: { label: "Low", icon: "minus" },
  2: { label: "Med", icon: "alert-circle" },
  3: { label: "High", icon: "alert-triangle" },
};

export default function PlansScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null);

  const { plans, isLoading, create, update, remove, refetch } = usePlans();

  const glassBg =
    mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
  const glassBorder =
    mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleDelete = useCallback(
    (plan: PlanRecord) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Delete Plan", `Remove "${plan.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await remove(plan.id);
            } catch {
              Alert.alert("Error", "Could not delete plan.");
            }
          },
        },
      ]);
    },
    [remove],
  );

  const handleSavePlan = useCallback(
    async (data: {
      title: string;
      description: string | null;
      category: string | null;
      targetDate: string | null;
      budget: number | null;
      status: string;
      priority: number;
      isPrivate: boolean;
    }) => {
      if (editingPlan) {
        await update(editingPlan.id, data);
        setEditingPlan(null);
        return;
      }

      await create(data);
    },
    [create, editingPlan, update],
  );

  const openEdit = useCallback((plan: PlanRecord) => {
    setEditingPlan(plan);
    sheetRef.current?.present();
  }, []);

  const openCreate = useCallback(() => {
    setEditingPlan(null);
    sheetRef.current?.present();
  }, []);

  const renderEditAction = useCallback(
    (plan: PlanRecord) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.primary }]}
        onPress={() => openEdit(plan)}
      >
        <Feather name="edit-3" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.primary, openEdit],
  );

  const renderDeleteAction = useCallback(
    (plan: PlanRecord) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.error }]}
        onPress={() => handleDelete(plan)}
      >
        <Feather name="trash-2" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.error, handleDelete],
  );

  const groupedPlans = STATUS_GROUPS.map((group) => ({
    ...group,
    items:
      plans?.filter(
        (p) =>
          p.status === group.key &&
          matchesSelectedDate(p.targetDate, selectedDate),
      ) ?? [],
  })).filter((g) => g.items.length > 0);

  const hasPlans = groupedPlans.length > 0;

  const renderPlanCard = (plan: PlanRecord, index: number) => {
    const pri = PRIORITY_CONFIG[plan.priority];
    const row = (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openEdit(plan)}
        style={[
          togetherItemContainerStyle,
          styles.planCard,
          { backgroundColor: C.card },
        ]}
      >
        {/* Title row */}
        <View style={styles.cardTop}>
          <Text
            style={[styles.planTitle, { color: C.text }]}
            numberOfLines={1}
          >
            {plan.title}
          </Text>
          {pri && (
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: glassBg, borderColor: glassBorder },
              ]}
            >
              <Feather name={pri.icon} size={11} color={C.textTertiary} />
              <Text style={[styles.priorityText, { color: C.textTertiary }]}>
                {pri.label}
              </Text>
            </View>
          )}
        </View>

        {/* Category */}
        {plan.category && (
          <Text style={[styles.planCategory, { color: C.textSecondary }]}>
            {plan.category}
          </Text>
        )}

        {/* Meta row */}
        <View style={styles.metaRow}>
          {plan.targetDate && (
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color={C.textTertiary} />
              <Text style={[styles.metaText, { color: C.textTertiary }]}>
                {format(
                  new Date(`${plan.targetDate}T00:00:00`),
                  "MMM d, yyyy",
                )}
              </Text>
            </View>
          )}
          {plan.budget != null && plan.budget > 0 && (
            <View style={styles.metaItem}>
              <Feather name="dollar-sign" size={12} color={C.textTertiary} />
              <Text style={[styles.metaText, { color: C.textTertiary }]}>
                {plan.budget.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );

    return (
      <Animated.View
        key={plan.id}
        entering={FadeInDown.duration(400).delay(index * 60)}
      >
        <Swipeable
          renderLeftActions={renderEditAction(plan)}
          renderRightActions={renderDeleteAction(plan)}
          overshootLeft={false}
          overshootRight={false}
          friction={2}
        >
          {row}
        </Swipeable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <MiniDateRail
          title="Plans"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          accentColor={C.plans}
          onPressLeading={() => {
            Haptics.selectionAsync();
            router.replace("/(tabs)/together");
          }}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            togetherListContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.plans}
            />
          }
        >
          {hasPlans ? (
            <View style={styles.groupsWrap}>
              {groupedPlans.map((group, groupIdx) => (
                <Animated.View
                  key={group.key}
                  entering={FadeInDown.duration(400).delay(groupIdx * 100)}
                  style={styles.groupSection}
                >
                  <Text style={[styles.groupLabel, { color: C.textTertiary, paddingHorizontal: Spacing['2xl'] }]}>
                    {group.label.toUpperCase()}
                  </Text>
                  <View style={styles.groupCards}>
                    {group.items.map((plan, idx) =>
                      renderPlanCard(plan, groupIdx * 10 + idx),
                    )}
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="clipboard"
                title={selectedDate ? "No plans on this date" : "No plans yet"}
                description={
                  selectedDate
                    ? "Pick another day or clear the date filter."
                    : "No plans yet — dream something up together"
                }
                actionLabel="Create Plan"
                onAction={openCreate}
              />
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openCreate();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.plans }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreatePlanSheet
          sheetRef={sheetRef}
          onSave={handleSavePlan}
          plan={
            editingPlan
              ? {
                  id: editingPlan.id,
                  title: editingPlan.title,
                  description: editingPlan.description ?? null,
                  category: editingPlan.category ?? null,
                  targetDate: editingPlan.targetDate ?? null,
                }
              : undefined
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  helperLabel: {
    ...Typography.bodyMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subHelperLabel: {
    ...Typography.small,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.largeTitle,
  },

  // Scroll
  scrollContent: {
    paddingBottom: 120,
  },

  // Groups
  groupsWrap: {
    gap: Spacing["2xl"],
    paddingTop: Spacing.md,
  },
  groupSection: {
    gap: Spacing.md,
  },
  groupLabel: {
    ...Typography.overline,
    letterSpacing: 3,
  },
  groupCards: {
    gap: Spacing.sm,
  },

  // Plan card
  planCard: {
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  planTitle: {
    ...Typography.subheading,
    flex: 1,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  priorityText: {
    ...Typography.small,
    letterSpacing: 0.5,
  },
  planCategory: {
    ...Typography.caption,
    lineHeight: 18,
  },

  // Meta
  metaRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...Typography.small,
  },

  // Empty
  emptyWrap: {
    paddingTop: Spacing['2xl'],
    justifyContent: 'center',
  },
  swipeAction: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingFab: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
