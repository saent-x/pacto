import { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useMutation } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { format } from 'date-fns';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { CreatePlanSheet } from '@/src/components/plans/CreatePlanSheet';

const listPlansQuery = makeFunctionReference<'query', { statuses?: string[] }, any>('plans:listPlans');
const deletePlanMutation = makeFunctionReference<'mutation', {}, any>('plans:deletePlan');

interface PlanRecord {
  _id: string;
  title: string;
  description: string | null;
  category: string | null;
  targetDate: string | null;
  budget: number | null;
  status: string;
  priority: number;
  isPrivate: boolean;
  createdAt: number;
}

const STATUS_GROUPS = [
  { key: 'active', label: 'Active' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'on_hold', label: 'On Hold' },
] as const;

const PRIORITY_CONFIG: Record<number, { label: string; icon: 'minus' | 'alert-circle' | 'alert-triangle' }> = {
  1: { label: 'Low', icon: 'minus' },
  2: { label: 'Med', icon: 'alert-circle' },
  3: { label: 'High', icon: 'alert-triangle' },
};

export default function PlansScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null);

  const plansResult = useQuery(listPlansQuery, {});
  const plans = plansResult as PlanRecord[] | undefined;
  const deletePlan = useMutation(deletePlanMutation) as any;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleDelete = useCallback(
    (plan: PlanRecord) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Delete Plan', `Remove "${plan.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan({ id: plan._id });
            } catch {
              Alert.alert('Error', 'Could not delete plan.');
            }
          },
        },
      ]);
    },
    [deletePlan],
  );

  const handleSavePlan = useCallback(
    async (data: { title: string; description: string | null; category: string | null; targetDate: string | null; budget: number | null; status: string; priority: number; isPrivate: boolean }) => {
      // Handled by CreatePlanSheet internally via Convex
    },
    [],
  );

  const openEdit = useCallback((plan: PlanRecord) => {
    setEditingPlan(plan);
    sheetRef.current?.present();
  }, []);

  const openCreate = useCallback(() => {
    setEditingPlan(null);
    sheetRef.current?.present();
  }, []);

  const groupedPlans = STATUS_GROUPS.map((group) => ({
    ...group,
    items: plans?.filter((p) => p.status === group.key) ?? [],
  })).filter((g) => g.items.length > 0);

  const hasPlans = plans && plans.length > 0;

  const renderPlanCard = (plan: PlanRecord, index: number) => {
    const pri = PRIORITY_CONFIG[plan.priority];
    return (
      <Animated.View key={plan._id} entering={FadeInDown.duration(400).delay(index * 60)}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openEdit(plan)}
          onLongPress={() => handleDelete(plan)}
          style={[styles.planCard, { backgroundColor: C.card, borderColor: C.border }]}
        >
          {/* Title row */}
          <View style={styles.cardTop}>
            <Text style={[styles.planTitle, { color: C.text }]} numberOfLines={1}>
              {plan.title}
            </Text>
            {pri && (
              <View style={[styles.priorityBadge, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                <Feather name={pri.icon} size={11} color={C.textTertiary} />
                <Text style={[styles.priorityText, { color: C.textTertiary }]}>{pri.label}</Text>
              </View>
            )}
          </View>

          {/* Category */}
          {plan.category && (
            <Text style={[styles.planCategory, { color: C.textSecondary }]}>{plan.category}</Text>
          )}

          {/* Meta row */}
          <View style={styles.metaRow}>
            {plan.targetDate && (
              <View style={styles.metaItem}>
                <Feather name="calendar" size={12} color={C.textTertiary} />
                <Text style={[styles.metaText, { color: C.textTertiary }]}>
                  {format(new Date(plan.targetDate), 'MMM d, yyyy')}
                </Text>
              </View>
            )}
            {plan.budget != null && plan.budget > 0 && (
              <View style={styles.metaItem}>
                <Feather name="dollar-sign" size={12} color={C.textTertiary} />
                <Text style={[styles.metaText, { color: C.textTertiary }]}>
                  {plan.budget.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.background }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Our Plans</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.plans} />
          }
        >
          {hasPlans ? (
            <View style={styles.groupsWrap}>
              {groupedPlans.map((group, groupIdx) => (
                <Animated.View key={group.key} entering={FadeInDown.duration(400).delay(groupIdx * 100)} style={styles.groupSection}>
                  <Text style={[styles.groupLabel, { color: C.textTertiary }]}>{group.label.toUpperCase()}</Text>
                  <View style={styles.groupCards}>
                    {group.items.map((plan, idx) => renderPlanCard(plan, groupIdx * 10 + idx))}
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="clipboard"
                title="No plans yet"
                description="No plans yet — dream something up together"
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

        <CreatePlanSheet sheetRef={sheetRef} onSave={handleSavePlan} plan={editingPlan ? {
          id: editingPlan._id,
          title: editingPlan.title,
          description: editingPlan.description,
          category: editingPlan.category,
          targetDate: editingPlan.targetDate,
          budget: editingPlan.budget,
          status: editingPlan.status,
          priority: editingPlan.priority,
          isPrivate: editingPlan.isPrivate,
        } : undefined} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 20,
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },

  // Groups
  groupsWrap: {
    gap: Spacing['2xl'],
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  planTitle: {
    ...Typography.subheading,
    flex: 1,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.small,
  },

  // Empty
  emptyWrap: {
    height: 400,
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
