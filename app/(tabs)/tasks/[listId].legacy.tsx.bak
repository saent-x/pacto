// app/(tabs)/tasks/[listId].tsx
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display, Pill, RoundBtn } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { TaskRow } from '@/src/components/tasks/TaskRow';
import { bucketOf, orderBuckets } from '@/src/components/tasks/buckets';
import { taskTokens } from '@/src/components/tasks/tokens';
import {
  RowActionMenu,
  type ActionMenuPayload,
} from '@/src/components/ui/RowActionMenu';
import { confirmDestructive } from '@/src/lib/confirm';
import { useTaskLists, type ListRow } from '@/src/hooks/useTaskLists';
import { useTaskItems } from '@/src/hooks/useTasks';
import { useTheme } from '@/src/lib/theme';
import type { Task } from '@/src/types/database';

export default function TaskListDetail() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { C, F } = useTheme();
  const insets = useSafeAreaInsets();

  const { lists, isLoading: listsLoading } = useTaskLists();
  const list: ListRow | null = useMemo(
    () => lists.find((l) => l.id === listId) ?? null,
    [lists, listId],
  );

  const { tasks, isLoading: tasksLoading, toggleComplete, remove, reorder } =
    useTaskItems(listId ?? null);

  const color = list ? ((C as any)[list.colorKey] as string) : C.gold;

  const active = tasks.filter((t) => !t.is_completed);
  const done = tasks.filter((t) => t.is_completed);
  const pct = tasks.length ? done.length / tasks.length : 0;

  const bucketColor: Record<string, string> = {
    Overdue: C.error,
    Today: C.gold,
    Tomorrow: C.peach,
    'This week': C.lavender,
    Later: C.fog,
    JAN: C.sky, FEB: C.sky, MAR: C.sky, APR: C.sky,
    MAY: C.sky, JUN: C.butter, JUL: C.butter, AUG: C.butter,
    SEP: C.rose, OCT: C.rose, NOV: C.rose, DEC: C.rose,
  };

  const sections = useMemo(() => {
    const buckets = new Map<string, Task[]>();
    active.forEach((t) => {
      const b = bucketOf(t.due_date, undefined);
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b)!.push(t);
    });
    const labels = orderBuckets(Array.from(buckets.keys()));
    return labels.map((label) => ({
      label: label.toUpperCase(),
      color: bucketColor[label] ?? C.fog,
      items: buckets.get(label)!,
    }));
  }, [active, bucketColor, C.fog]);

  const listName = list?.name ?? (listsLoading ? '...' : 'List');
  const isEmpty = !listsLoading && !tasksLoading && tasks.length === 0;

  // Bucket-scoped reorder: track which bucket (if any) is in reorder mode,
  // plus a local copy of its ids so we can swap before persisting.
  const [reorderBucket, setReorderBucket] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  const enterReorder = useCallback((bucketLabel: string, ids: string[]) => {
    setReorderBucket(bucketLabel);
    setLocalOrder(ids);
  }, []);

  const exitReorder = useCallback(() => {
    if (reorderBucket === null) return;
    // Persist whole-list order: localOrder for reordered bucket, then the
    // other active ids in their current section order, then completed.
    const reorderedSet = new Set(localOrder);
    const activeIds = active.map((t) => t.id);
    const otherActive = activeIds.filter((tid) => !reorderedSet.has(tid));
    const completed = done.map((t) => t.id);
    void reorder([...localOrder, ...otherActive, ...completed]);
    setReorderBucket(null);
    setLocalOrder([]);
  }, [reorderBucket, localOrder, active, done, reorder]);

  // When tasks change (e.g. new sync) outside of reorder mode, drop stale state.
  useEffect(() => {
    if (reorderBucket === null) setLocalOrder([]);
  }, [tasks, reorderBucket]);

  const move = useCallback(
    (taskId: string, direction: -1 | 1) => {
      setLocalOrder((prev) => {
        const idx = prev.indexOf(taskId);
        if (idx === -1) return prev;
        const target = idx + direction;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        const [removed] = next.splice(idx, 1);
        next.splice(target, 0, removed);
        return next;
      });
    },
    [],
  );

  const buildTaskMenu = useCallback(
    (task: Task, bucketLabel: string, bucketIds: string[]): ActionMenuPayload => ({
      title: task.title,
      subtitle: list?.name,
      actions: [
        {
          key: 'edit',
          label: 'Edit',
          icon: 'edit',
          onPress: () => {
            if (!listId) return;
            router.push(`/sheets/new-task?listId=${listId}&id=${task.id}` as any);
          },
        },
        {
          key: 'reorder',
          label: 'Reorder',
          icon: 'chevronsUp',
          disabled: bucketIds.length < 2,
          onPress: () => enterReorder(bucketLabel, bucketIds),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: 'trash',
          destructive: true,
          onPress: () => {
            confirmDestructive(
              'Delete task?',
              `"${task.title}" will be removed.`,
              () => remove(task.id),
            );
          },
        },
      ],
    }),
    [enterReorder, list?.name, listId, remove],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <TaskListDetailHeader
              listName={listName}
              color={color}
              pct={pct}
              doneCount={done.length}
              totalCount={tasks.length}
              onAdd={() =>
                list && router.push(`/sheets/new-task?listId=${list.id}` as any)
              }
            />
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <EmptyTasks listName={listName} onAdd={() => list && router.push(`/sheets/new-task?listId=${list.id}` as any)} />
        ) : tasksLoading && tasks.length === 0 ? (
          <DetailSkeleton />
        ) : (
          <>
            {sections.map((s, si) => (
              <Animated.View
                key={s.label}
                entering={FadeInDown.delay(si * 60).duration(360).springify().damping(18)}
                style={{ marginBottom: 18 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                    marginBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: C.line,
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
                  <Text
                    style={{
                      fontFamily: F.bodyBold,
                      fontSize: 10,
                      letterSpacing: 1.6,
                      color: C.bone,
                      textTransform: 'uppercase',
                    }}
                  >
                    {s.label}
                  </Text>
                  <Text style={{ fontSize: 10, color: C.fog, fontFamily: F.bodyBold, flex: 1 }}>
                    {s.items.length}
                  </Text>
                  {reorderBucket === s.label ? (
                    <Pressable
                      testID={`task-reorder-done-${s.label}`}
                      onPress={exitReorder}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: color,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontFamily: F.bodyBold,
                          letterSpacing: 0.6,
                          color: C.ink,
                          textTransform: 'uppercase',
                        }}
                      >
                        Done
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <Animated.View layout={LinearTransition.springify().damping(18)} style={{ gap: 8 }}>
                  {(() => {
                    const isReorderingHere = reorderBucket === s.label;
                    const orderedIds = isReorderingHere
                      ? localOrder
                      : s.items.map((t) => t.id);
                    return orderedIds.map((tid, idx, arr) => {
                      const t = s.items.find((x) => x.id === tid);
                      if (!t) return null;
                      const row = (
                        <TaskRow
                          task={t}
                          listColor={color}
                          state={isReorderingHere ? 'reordering' : 'idle'}
                          testID={`task-row-${t.id}`}
                          onToggle={() => toggleComplete(t)}
                          onMoveUp={isReorderingHere ? () => move(tid, -1) : undefined}
                          onMoveDown={isReorderingHere ? () => move(tid, 1) : undefined}
                          canMoveUp={isReorderingHere && idx > 0}
                          canMoveDown={isReorderingHere && idx < arr.length - 1}
                        />
                      );
                      if (isReorderingHere) return <React.Fragment key={t.id}>{row}</React.Fragment>;
                      return (
                        <RowActionMenu
                          key={t.id}
                          {...buildTaskMenu(t, s.label, s.items.map((x) => x.id))}
                        >
                          {row}
                        </RowActionMenu>
                      );
                    });
                  })()}
                </Animated.View>
              </Animated.View>
            ))}

            {done.length > 0 ? (
              <CompletedSection
                color={color}
                done={done}
                onToggle={toggleComplete}
                buildMenu={(t) => buildTaskMenu(t, 'COMPLETED', done.map((x) => x.id))}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TaskListDetailHeader({
  listName,
  color,
  pct,
  doneCount,
  totalCount,
  onAdd,
}: {
  listName: string;
  color: string;
  pct: number;
  doneCount: number;
  totalCount: number;
  onAdd: () => void;
}) {
  const { C, F } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingHorizontal: 18,
        paddingBottom: 18,
        backgroundColor: C.coal,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <RoundBtn icon="chevronLeft" size={38} onPress={() => router.back()} />
        <Pill active bg={`${color}25`} color={color} size="sm">
          {listName.toUpperCase()}
        </Pill>
        <RoundBtn icon="plus" size={38} onPress={onAdd} />
      </View>
      <Display size={34}>{listName}</Display>
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            flex: 1,
            height: 4,
            backgroundColor: C.line,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <AnimatedBar pct={pct * 100} color={color} />
        </View>
        <Text style={{ fontFamily: F.displayBold, fontSize: 13, color: C.bone }}>
          {doneCount}
          <Text style={{ color: C.fog }}>/{totalCount}</Text>
        </Text>
      </View>
    </View>
  );
}

function CompletedSection({
  color,
  done,
  onToggle,
  buildMenu,
}: {
  color: string;
  done: Task[];
  onToggle: (t: Task) => void;
  buildMenu: (t: Task) => ActionMenuPayload;
}) {
  const { C, F } = useTheme();
  return (
    <View style={{ marginTop: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 4,
          marginBottom: 10,
        }}
      >
        <Icon name="chevronDown" size={12} color={C.fog} />
        <Text
          style={{
            color: C.fog,
            fontSize: 10,
            fontFamily: F.bodyBold,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          Completed · {done.length}
        </Text>
      </View>
      <Animated.View layout={LinearTransition.springify().damping(18)} style={{ gap: 8, opacity: 0.55 }}>
        {done.map((t) => (
          <RowActionMenu key={t.id} {...buildMenu(t)}>
            <TaskRow
              task={t}
              listColor={color}
              testID={`task-row-${t.id}`}
              onToggle={() => onToggle(t)}
            />
          </RowActionMenu>
        ))}
      </Animated.View>
    </View>
  );
}

function EmptyTasks({ listName, onAdd }: { listName: string; onAdd: () => void }) {
  const { C, F } = useTheme();
  return (
    <View testID="tasks-detail-empty" style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
      <Icon name="checkSquare" size={28} color={C.fog} />
      <Text style={{ fontFamily: F.displayBold, fontSize: 22, color: C.bone, letterSpacing: -0.3 }}>
        All clear.
      </Text>
      <Text style={{ fontSize: 12, color: C.fog, fontFamily: F.body }}>
        Nothing on {listName} yet.
      </Text>
      <Pressable
        testID="tasks-detail-empty-add"
        onPress={onAdd}
        style={{
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: C.goldSoft,
        }}
      >
        <Icon name="plus" size={14} color={C.gold} />
        <Text style={{ color: C.gold, fontFamily: F.bodyBold, fontSize: 12, letterSpacing: 0.4 }}>
          Add a task
        </Text>
      </Pressable>
    </View>
  );
}

function DetailSkeleton() {
  const { C } = useTheme();
  return (
    <View>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            height: taskTokens.rowMinHeight,
            backgroundColor: C.card,
            borderRadius: taskTokens.rowRadius,
            borderWidth: 1,
            borderColor: C.line,
            marginBottom: 10,
            opacity: 0.6,
          }}
        />
      ))}
    </View>
  );
}

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? pct : 0);
  useEffect(() => {
    if (reduced) {
      w.value = pct;
      return;
    }
    w.value = withTiming(pct, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct, reduced, w]);
  const style = useAnimatedStyle(() => ({
    width: `${w.value}%`,
  }));
  return (
    <Animated.View
      style={[{ height: '100%', backgroundColor: color }, style]}
    />
  );
}
