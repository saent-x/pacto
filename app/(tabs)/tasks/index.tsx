import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, LayoutAnimation, Platform, UIManager, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '@/src/hooks/useColors';
import { buildTaskFeedViewState, useTasks } from '@/src/hooks/useTasks';
import { useSwipeTabs } from '@/src/hooks/useSwipeTabs';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { MiniDateRail } from '@/src/components/calendar/MiniDateRail';
import { EmptyState } from '@/src/components/ui';
import { AUTO_CREATE_TASK_LIST_ID, CreateTaskSheet } from '@/src/components/tasks/CreateTaskSheet';
import type { Task } from '@/src/types/database';

export default function TasksScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { lists, allTasks, isLoading, createTask, createTaskInDefaultList, updateTask, toggleTask, deleteTask, refetch } = useTasks();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [optimisticCompletion, setOptimisticCompletion] = useState<Record<string, boolean>>({});
  const [pendingTaskIds, setPendingTaskIds] = useState<Record<string, true>>({});
  const [savingTask, setSavingTask] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  const tabSwipe = useSwipeTabs({
    tabs: ['all', 'active', 'done'] as const,
    value: filter,
    onChange: setFilter,
  });
  const feedState = useMemo(() => buildTaskFeedViewState(lists, allTasks, filter), [allTasks, filter, lists]);
  const taskFeed = useMemo(
    () =>
      feedState.items.map((item) =>
        optimisticCompletion[item.id] === undefined
          ? item
          : { ...item, is_completed: optimisticCompletion[item.id] },
      ),
    [feedState.items, optimisticCompletion],
  );
  const visibleTaskFeed = useMemo(
    () =>
      selectedDate
        ? taskFeed.filter((item) => item.due_date === selectedDate)
        : taskFeed,
    [selectedDate, taskFeed],
  );

  const openTaskComposer = () => {
    setEditingTask(undefined);
    sheetRef.current?.present();
  };

  const handleSave = async (data: Parameters<typeof createTask>[0]) => {
    if (savingTask) return;
    setSavingTask(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data);
        setEditingTask(undefined);
        return;
      }

      if (data.list_id === AUTO_CREATE_TASK_LIST_ID) {
        await createTaskInDefaultList({
          title: data.title,
          notes: data.notes,
          due_date: data.due_date,
          priority: data.priority,
          assigned_to: data.assigned_to,
        });
        return;
      }

      await createTask(data);
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggle = async (item: Task) => {
    if (pendingTaskIds[item.id]) return;
    const nextValue = !item.is_completed;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOptimisticCompletion((current) => ({ ...current, [item.id]: nextValue }));
    setPendingTaskIds((current) => ({ ...current, [item.id]: true }));
    try {
      await toggleTask(item);
    } finally {
      setOptimisticCompletion((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setPendingTaskIds((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    }
  };

  const openTaskEditor = (item: Task) => {
    setEditingTask(item);
    sheetRef.current?.present();
  };

  const handleDelete = (item: Task) => {
    if (pendingTaskIds[item.id]) return;
    Alert.alert('Delete task', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPendingTaskIds((current) => ({ ...current, [item.id]: true }));
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          try {
            await deleteTask(item.id);
          } finally {
            setPendingTaskIds((current) => {
              const next = { ...current };
              delete next[item.id];
              return next;
            });
          }
        },
      },
    ]);
  };

  const openCount = visibleTaskFeed.filter((item) => !item.is_completed).length;
  const doneCount = visibleTaskFeed.filter((item) => item.is_completed).length;
  const renderSwipeRight = useCallback((item: Task) => () => (
    <TouchableOpacity
      style={[styles.swipeAction, styles.swipeDelete, { backgroundColor: C.error }]}
      onPress={() => handleDelete(item)}
    >
      <Feather name="trash-2" size={18} color="#fff" />
    </TouchableOpacity>
  ), [C]);
  const renderSwipeLeft = useCallback((item: Task) => () => (
    <TouchableOpacity
      style={[styles.swipeAction, styles.swipeComplete, { backgroundColor: item.is_completed ? C.info : C.success }]}
      onPress={() => handleToggle(item)}
    >
      <Feather name={item.is_completed ? 'rotate-ccw' : 'check'} size={18} color="#fff" />
    </TouchableOpacity>
  ), [C]);

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={[styles.flex, { backgroundColor: C.background }]} edges={['top']}>
        <MiniDateRail
          title="Tasks"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          accentColor={C.tasks}
          onPressAction={openTaskComposer}
          actionIcon="plus"
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'done', label: 'Done' },
          ]}
          selectedTab={filter}
          onSelectTab={(value) => setFilter(value as 'all' | 'active' | 'done')}
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

        {!isLoading && (feedState.emptyState || visibleTaskFeed.length === 0) ? (
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.tasks} />
            }
            showsVerticalScrollIndicator={false}
            {...tabSwipe.panHandlers}
          >
            <EmptyState
              icon="check-square"
              title={selectedDate && visibleTaskFeed.length === 0 ? 'No tasks on this date' : feedState.emptyState?.title ?? 'No tasks yet'}
              description={
                selectedDate && visibleTaskFeed.length === 0
                  ? 'Pick another day or clear the date filter.'
                  : feedState.emptyState?.description ?? 'Add your first task and Coupl will create a General list automatically.'
              }
              actionLabel={feedState.emptyState?.actionLabel ?? 'Add Task'}
              onAction={openTaskComposer}
            />
          </ScrollView>
        ) : (
          <FlatList
            data={visibleTaskFeed}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.tasks} />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            {...tabSwipe.panHandlers}
            renderItem={({ item }) => {
              const dueLabel = item.due_date ? format(new Date(`${item.due_date}T00:00:00`), 'MMM d') : null;
              const listColor = item.list?.color ?? C.tasks;
              const isCompleted = item.is_completed;
              const isPending = !!pendingTaskIds[item.id];
              const priorityColor =
                item.priority === 3 ? C.error : item.priority === 2 ? C.warning : C.tasks;
              return (
                <Swipeable
                  renderRightActions={renderSwipeRight(item)}
                  renderLeftActions={renderSwipeLeft(item)}
                  overshootRight={false}
                  overshootLeft={false}
                  friction={2}
                >
                  <TouchableOpacity
                    style={styles.taskWrap}
                    activeOpacity={0.85}
                    disabled={isPending}
                    onPress={() => {
                      Haptics.selectionAsync();
                      openTaskEditor(item);
                    }}
                  >
                    <View
                      style={[
                        styles.taskRow,
                        {
                          backgroundColor: isCompleted ? C.tasksLight : C.card,
                          opacity: isPending ? 0.6 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.priorityRail, { backgroundColor: item.priority > 0 ? priorityColor : C.dim }]} />
                      <TouchableOpacity
                        onPress={() => handleToggle(item)}
                        disabled={isPending}
                        style={[
                          styles.checkbox,
                          { borderColor: isCompleted ? C.tasks : C.dusk, backgroundColor: isCompleted ? C.tasks : 'transparent' },
                          isCompleted && { backgroundColor: C.tasks },
                        ]}
                        hitSlop={8}
                      >
                        {isCompleted && <Feather name="check" size={13} color={C.ink} />}
                      </TouchableOpacity>
                      <View style={styles.taskBody}>
                        <View style={styles.kickerRow}>
                          {item.list ? (
                            <View style={[styles.listBadge, { backgroundColor: C.card, borderColor: C.border }]}>
                              <View style={[styles.listDot, { backgroundColor: listColor }]} />
                              <Text style={[styles.listMetaText, { color: C.textTertiary }]} numberOfLines={1}>
                                {item.list.name}
                              </Text>
                            </View>
                          ) : null}
                          {dueLabel ? (
                            <Text style={[styles.kickerText, { color: isCompleted ? C.textTertiary : C.textSecondary }]}>
                              Due {dueLabel}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.taskTitle,
                            { color: isCompleted ? C.textTertiary : C.text },
                            isCompleted && styles.strikethrough,
                          ]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        {!!item.notes && (
                          <Text style={[styles.taskNote, { color: C.textTertiary }]} numberOfLines={1}>
                            {item.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              );
            }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openTaskComposer();
          }}
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: C.tasks }]}
        >
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>

        <CreateTaskSheet
          sheetRef={sheetRef}
          onSave={handleSave}
          task={editingTask}
          lists={lists}
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
  listContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 71,
  },
  taskWrap: {
    backgroundColor: 'transparent',
  },
  taskRow: {
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
  taskBody: {
    flex: 1,
    gap: 6,
  },
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
  kickerText: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskTitle: {
    ...Typography.bodyMedium,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
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
  taskNote: {
    ...Typography.small,
  },
  swipeAction: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDelete: {},
  swipeComplete: {},
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
