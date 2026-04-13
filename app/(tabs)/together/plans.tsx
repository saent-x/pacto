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
    const priorityColor =
      plan.priority === 3 ? C.error : plan.priority === 2 ? C.warning : C.plans;
    const dueLabel = plan.targetDate
      ? format(new Date(`${plan.targetDate}T00:00:00`), "MMM d, yyyy")
      : null;
    const row = (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openEdit(plan)}
        style={[
          togetherItemContainerStyle,
          styles.planCard,
          { backgroundColor: C.card },
        ]}
      >
        <View style={[styles.priorityRail, { backgroundColor: plan.priority > 0 ? priorityColor : C.dim }]} />
        <View style={[styles.planIcon, { backgroundColor: C.plansLight }]}>
          <Feather name="compass" size={13} color={C.plans} />
        </View>
        <View style={styles.planBody}>
          <View style={styles.kickerRow}>
            {plan.category ? (
              <View style={[styles.listBadge, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={[styles.listDot, { backgroundColor: C.plans }]} />
                <Text style={[styles.listMetaText, { color: C.textTertiary }]} numberOfLines={1}>
                  {plan.category}
                </Text>
              </View>
            ) : null}
            {dueLabel ? (
              <Text style={[styles.kickerText, { color: C.textSecondary }]}>
                Due {dueLabel}
              </Text>
            ) : null}
          </View>
          <Text
            style={[styles.planTitle, { color: C.text }]}
            numberOfLines={2}
          >
            {plan.title}
          </Text>
          {plan.description ? (
            <Text style={[styles.planNote, { color: C.textTertiary }]} numberOfLines={1}>
              {plan.description}
            </Text>
          ) : null}
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
                    {group.items.map((plan, idx) => (
                      <View key={plan.id}>
                        {idx > 0 && (
                          <View
                            style={{
                              height: StyleSheet.hairlineWidth,
                              marginLeft: 71,
                              backgroundColor: C.dim,
                            }}
                          />
                        )}
                        {renderPlanCard(plan, groupIdx * 10 + idx)}
                      </View>
                    ))}
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
  groupCards: {},

  // Plan card
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 56,
  },
  priorityRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  planIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  planBody: {
    flex: 1,
    gap: 6,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  listBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listMetaText: {
    ...Typography.small,
    maxWidth: 160,
  },
  kickerText: {
    ...Typography.small,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  planTitle: {
    ...Typography.bodyMedium,
  },
  planNote: {
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
