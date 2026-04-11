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
    return (
      <Swipeable
        renderRightActions={renderSwipeRight(item)}
        renderLeftActions={renderSwipeLeft(item)}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
      >
        <TouchableOpacity
          style={[styles.reminderRow, { backgroundColor: C.background, opacity: isPending ? 0.6 : 1 }]}
          activeOpacity={0.6}
          disabled={isPending}
          onPress={() => openEdit(item)}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            handleDelete(item);
          }}
        >
          <TouchableOpacity
            onPress={() => handleToggle(item)}
            disabled={isPending}
            style={[
              styles.checkbox,
              {
                borderColor: item.is_completed ? C.reminders : mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              },
              item.is_completed && { backgroundColor: C.reminders },
            ]}
          >
            {item.is_completed && <Feather name="check" size={14} color="#fff" />}
          </TouchableOpacity>
          <View style={styles.reminderBody}>
            <Text
              style={[
                styles.reminderTitle,
                { color: item.is_completed ? C.textTertiary : C.text },
                item.is_completed && styles.strikethrough,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[styles.reminderMeta, { color: overdue ? C.error : C.textTertiary }]}>
              {format(new Date(item.due_at), 'MMM d, h:mm a')}
              {item.category ? ` · ${item.category}` : ''}
            </Text>
          </View>
          {item.priority > 0 && (
            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor:
                    item.priority === 3 ? C.errorLight : item.priority === 2 ? C.warningLight : C.primaryMuted,
                },
              ]}
            >
              <Feather
                name={item.priority === 3 ? 'alert-triangle' : item.priority === 2 ? 'alert-circle' : 'minus'}
                size={12}
                color={item.priority === 3 ? C.error : item.priority === 2 ? C.warning : C.haze}
              />
            </View>
          )}
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
        {!hasItems && !isLoading ? (
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.reminders} />
            }
            showsVerticalScrollIndicator={false}
            {...tabSwipe.panHandlers}
          >
            <EmptyState
              icon="bell"
              title="No reminders yet"
              description="Create shared reminders so you never forget what matters."
              actionLabel="Add Reminder"
              onAction={openCreate}
            />
          </ScrollView>
        ) : (
          <FlashList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.reminders} />
            }
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: glassBorder }]} />
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
  emptyContent: { paddingTop: Spacing.lg, paddingHorizontal: Spacing['2xl'] },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },

  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBody: { flex: 1 },
  reminderTitle: { ...Typography.body, fontSize: 15, marginBottom: 2 },
  strikethrough: { textDecorationLine: 'line-through' },
  reminderMeta: { ...Typography.small },
  priorityBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
