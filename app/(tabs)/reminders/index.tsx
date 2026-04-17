import { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format, isPast, isToday } from 'date-fns';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import { useReminders } from '@/src/hooks/useReminders';
import { useSwipeTabs } from '@/src/hooks/useSwipeTabs';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { MiniDateRail } from '@/src/components/calendar/MiniDateRail';
import { EmptyState } from '@/src/components/ui';
import { CreateReminderSheet } from '@/src/components/reminders/CreateReminderSheet';
import { Reminder } from '@/src/types/database';

type Filter = 'all' | 'mine' | 'partner';

function toLocalDateKey(value: string) {
  return format(new Date(value), 'yyyy-MM-dd');
}

function matchesReminderOwnerFilter(
  reminder: Reminder,
  filter: Filter,
  userId: string | null,
) {
  if (filter === 'mine') {
    return reminder.created_by === userId || reminder.assigned_to === userId;
  }

  if (filter === 'partner') {
    return reminder.created_by !== userId;
  }

  return true;
}

export default function RemindersScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const { profile } = useSession();
  const userId = profile?.id ?? null;
  const { upcoming, completed, isLoading, create, update, toggleComplete, remove, refetch } = useReminders();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [pendingReminderIds, setPendingReminderIds] = useState<Record<string, true>>({});
  const [refreshing, setRefreshing] = useState(false);

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.10)';

  const filtered = upcoming.filter((r) => {
    if (selectedDate && toLocalDateKey(r.due_at) !== selectedDate) return false;
    return matchesReminderOwnerFilter(r, filter, userId);
  });
  const filteredCompleted = completed.filter((r) => {
    if (selectedDate && toLocalDateKey(r.due_at) !== selectedDate) return false;
    return matchesReminderOwnerFilter(r, filter, userId);
  });
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  const tabSwipe = useSwipeTabs({
    tabs: ['all', 'mine', 'partner'] as const,
    value: filter,
    onChange: setFilter,
  });

  const handleSave = async (data: any) => {
    if (editingReminder) {
      await update(editingReminder.id, data);
    } else {
      await create(data);
    }
    setEditingReminder(undefined);
  };

  const openCreate = () => {
    setEditingReminder(undefined);
    sheetRef.current?.present();
  };

  const openEdit = (r: Reminder) => {
    setEditingReminder(r);
    sheetRef.current?.present();
  };

  const handleToggle = async (r: Reminder) => {
    if (pendingReminderIds[r.id]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPendingReminderIds((current) => ({ ...current, [r.id]: true }));
    try {
      await toggleComplete(r);
    } finally {
      setPendingReminderIds((current) => {
        const next = { ...current };
        delete next[r.id];
        return next;
      });
    }
  };

  const handleDelete = (r: Reminder) => {
    if (pendingReminderIds[r.id]) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Delete Reminder', `Remove "${r.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPendingReminderIds((current) => ({ ...current, [r.id]: true }));
          try {
            await remove(r.id);
          } finally {
            setPendingReminderIds((current) => {
              const next = { ...current };
              delete next[r.id];
              return next;
            });
          }
        },
      },
    ]);
  };

  const renderSwipeRight = useCallback((item: Reminder) => () => (
    <TouchableOpacity
      style={[styles.swipeAction, styles.swipeDelete, { backgroundColor: C.error }]}
      onPress={() => handleDelete(item)}
    >
      <Feather name="trash-2" size={18} color="#fff" />
    </TouchableOpacity>
  ), [C]);

  const renderSwipeLeft = useCallback((item: Reminder) => () => (
    <TouchableOpacity
      style={[styles.swipeAction, styles.swipeComplete, { backgroundColor: C.success }]}
      onPress={() => handleToggle(item)}
    >
      <Feather name={item.is_completed ? 'rotate-ccw' : 'check'} size={18} color="#fff" />
    </TouchableOpacity>
  ), [C]);

  const renderItem = ({ item }: { item: Reminder }) => {
    const overdue = !item.is_completed && isPast(new Date(item.due_at)) && !isToday(new Date(item.due_at));
    const isPending = !!pendingReminderIds[item.id];
    const isCompleted = item.is_completed;
    const priorityColor =
      item.priority === 3 ? C.error : item.priority === 2 ? C.warning : C.reminders;
    const dueLabel = format(new Date(item.due_at), 'MMM d, h:mm a');
    return (
      <Swipeable
        renderRightActions={renderSwipeRight(item)}
        renderLeftActions={renderSwipeLeft(item)}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
      >
        <TouchableOpacity
          style={[styles.reminderRow, {
            backgroundColor: isCompleted ? C.remindersLight : C.card,
            opacity: isPending ? 0.6 : 1,
          }]}
          activeOpacity={0.85}
          disabled={isPending}
          onPress={() => openEdit(item)}
        >
          <View style={[styles.priorityRail, { backgroundColor: item.priority > 0 ? priorityColor : C.dim }]} />
          <TouchableOpacity
            onPress={() => handleToggle(item)}
            disabled={isPending}
            style={[
              styles.checkbox,
              { borderColor: isCompleted ? C.reminders : C.dusk, backgroundColor: isCompleted ? C.reminders : 'transparent' },
            ]}
            hitSlop={8}
          >
            {isCompleted && <Feather name="check" size={13} color={C.ink} />}
          </TouchableOpacity>
          <View style={styles.reminderBody}>
            <View style={styles.kickerRow}>
              {item.category ? (
                <View style={[styles.listBadge, { backgroundColor: C.card, borderColor: C.border }]}>
                  <View style={[styles.listDot, { backgroundColor: C.reminders }]} />
                  <Text style={[styles.listMetaText, { color: C.textTertiary }]} numberOfLines={1}>
                    {item.category}
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.kickerText, { color: overdue ? C.error : (isCompleted ? C.textTertiary : C.textSecondary) }]}>
                {overdue ? 'Overdue · ' : 'Due '}{dueLabel}
              </Text>
            </View>
            <Text
              style={[
                styles.reminderTitle,
                { color: isCompleted ? C.textTertiary : C.text },
                isCompleted && styles.strikethrough,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const hasItems = filtered.length > 0 || filteredCompleted.length > 0;
  const openCount = filtered.length;
  const doneCount = filteredCompleted.length;

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={[styles.flex, { backgroundColor: C.screenBackground }]} edges={['top']}>
        {!hasItems && !isLoading ? (
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.reminders} />
            }
            showsVerticalScrollIndicator={false}
            {...tabSwipe.panHandlers}
          >
            <MiniDateRail
              title="Reminders"
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              accentColor={C.reminders}
              onPressAction={openCreate}
              actionIcon="plus"
              tabs={[
                { value: 'all', label: 'All' },
                { value: 'mine', label: 'Mine' },
                { value: 'partner', label: "Partner's" },
              ]}
              selectedTab={filter}
              onSelectTab={(value) => setFilter(value as Filter)}
            />
            <EmptyState
              icon="bell"
              title="No reminders yet"
              description="Create shared reminders so you never forget what matters."
              actionLabel="Add Reminder"
              onAction={openCreate}
            />
          </ScrollView>
        ) : (
          <>
          <FlashList
            data={filtered}
            ListHeaderComponent={
              <>
                <MiniDateRail
                  title="Reminders"
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  accentColor={C.reminders}
                  onPressAction={openCreate}
                  actionIcon="plus"
                  tabs={[
                    { value: 'all', label: 'All' },
                    { value: 'mine', label: 'Mine' },
                    { value: 'partner', label: "Partner's" },
                  ]}
                  selectedTab={filter}
                  onSelectTab={(value) => setFilter(value as Filter)}
                />
                <View style={[styles.header, { backgroundColor: C.background }]}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryText, { color: C.textTertiary }]}>
                      {openCount} open
                    </Text>
                    <View style={[styles.summaryDivider, { backgroundColor: C.border }]} />
                    <Text style={[styles.summaryText, { color: C.textTertiary }]}>
                      {doneCount} done
                    </Text>
                  </View>
                </View>
              </>
            }
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.reminders} />
            }
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: C.dim }]} />
            )}
            {...tabSwipe.panHandlers}
            ListFooterComponent={
              filteredCompleted.length > 0 ? (
                <View style={styles.completedSection}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowCompleted(!showCompleted);
                    }}
                    style={styles.completedToggle}
                  >
                    <Text style={[styles.completedLabel, { color: C.textTertiary }]}>
                      Completed ({filteredCompleted.length})
                    </Text>
                    <Feather name={showCompleted ? 'chevron-up' : 'chevron-down'} size={14} color={C.textTertiary} />
                  </TouchableOpacity>
                  {showCompleted && filteredCompleted.map((item) => (
                    <View key={item.id}>
                      {renderItem({ item })}
                    </View>
                  ))}
                </View>
              ) : null
            }
          />
          </>
        )}

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openCreate();
          }}
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: C.reminders }]}
        >
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>

        <CreateReminderSheet
          sheetRef={sheetRef}
          onSave={handleSave}
          reminder={editingReminder}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  summaryText: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  summaryDivider: {
    width: 18,
    height: StyleSheet.hairlineWidth,
  },
  listContent: { paddingBottom: 120 },
  emptyContent: { paddingBottom: Spacing.xl },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 71,
  },

  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingRight: Spacing['2xl'],
    paddingLeft: Spacing.lg,
    minHeight: 56,
  },
  priorityRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBody: { flex: 1, gap: 6 },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  listBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reminderTitle: { ...Typography.bodyMedium },
  strikethrough: { textDecorationLine: 'line-through' },

  // Swipe actions
  swipeAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDelete: {},
  swipeComplete: {},

  completedSection: { paddingTop: Spacing.md },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
  completedLabel: { ...Typography.captionMedium },
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
