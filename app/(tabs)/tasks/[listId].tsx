import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionEmptyState } from '@/src/components/ui/pacto/ActionEmptyState';
import { type Bucket, BucketedList } from '@/src/components/ui/pacto/BucketedList';
import { Card } from '@/src/components/ui/pacto/Card';
import { Checkbox } from '@/src/components/ui/pacto/Checkbox';
import { HeaderBrand } from '@/src/components/ui/pacto/HeaderBrand';
import { HeroPactoBadge } from '@/src/components/ui/pacto/HeroPactoBadge';
import { PriorityDot } from '@/src/components/ui/pacto/PriorityDot';
import { ScopeChip } from '@/src/components/ui/pacto/ScopeChip';
import { SwipeableRow } from '@/src/components/ui/pacto/SwipeableRow';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { bucketOf, orderBuckets } from '@/src/components/tasks/buckets';
import { useTaskLists } from '@/src/hooks/useTaskLists';
import { useTaskItems } from '@/src/hooks/useTasks';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { pastels } from '@/src/lib/tokens';
import type { Task } from '@/src/types/database';

export default function TaskListDetail() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { partner, mode } = useSession();
  const { lists } = useTaskLists();
  const list = useMemo(
    () => lists.find((l) => l.id === listId) ?? null,
    [lists, listId]
  );
  const { tasks, toggleComplete, remove, create } = useTaskItems(listId ?? null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const quickAddSavingRef = useRef(false);

  const partnerName = partner?.displayName ?? null;
  const youId = useSession().user?.id ?? null;
  const partnerId = partner?.id ?? null;

  const tilePastel = list ? ((pastels as any)[list.colorKey] ?? pastels.peach) : pastels.peach;

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.is_completed).length;
    const open = total - done;
    const overdue = tasks.filter(
      (t) =>
        !t.is_completed && t.due_date && bucketOf(t.due_date, undefined) === 'Overdue'
    ).length;
    return { total, done, open, overdue };
  }, [tasks]);

  const buckets = useMemo<Bucket<Task>[]>(() => {
    const groups = new Map<string, Task[]>();
    for (const t of tasks) {
      const label = t.is_completed
        ? 'Completed'
        : bucketOf(t.due_date, undefined);
      const list = groups.get(label) ?? [];
      list.push(t);
      groups.set(label, list);
    }
    const activeLabels = orderBuckets(
      Array.from(groups.keys()).filter((l) => l !== 'Completed')
    );
    const ordered = [
      ...activeLabels,
      ...(groups.has('Completed') ? ['Completed'] : []),
    ];
    const dotMap: Record<string, string> = {
      Overdue: C.error,
      Today: C.accent,
      Tomorrow: C.accent2,
      'This week': C.ink2,
      Later: C.ink3,
      Completed: C.ink3,
    };
    return ordered
      .filter((l) => (groups.get(l)?.length ?? 0) > 0)
      .map((label) => ({
        label,
        dotColor: dotMap[label] ?? C.ink3,
        rows: groups.get(label) ?? [],
      }));
  }, [tasks, C.error, C.accent, C.accent2, C.ink2, C.ink3]);

  const scopeFor = (t: Task): 'mine' | 'partner' | 'shared' => {
    if (!t.assigned_to) return 'shared';
    if (t.assigned_to === youId) return 'mine';
    if (t.assigned_to === partnerId) return 'partner';
    return 'shared';
  };

  const priorityLevel = (p: number): 'none' | 'low' | 'med' | 'high' => {
    if (p >= 3) return 'high';
    if (p === 2) return 'med';
    if (p === 1) return 'low';
    return 'none';
  };

  const handleQuickAdd = async () => {
    const title = quickAddTitle.trim();
    if (!title || quickAddSavingRef.current) return;

    quickAddSavingRef.current = true;
    setQuickAddSaving(true);
    try {
      await create({ title, due_date: null, priority: 0 });
      setQuickAddTitle('');
    } finally {
      quickAddSavingRef.current = false;
      setQuickAddSaving(false);
    }
  };

  const quickAddDisabled = !quickAddTitle.trim() || quickAddSaving;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          headerTintColor: C.inkColor,
          title: '',
          headerTitleAlign: 'center',
          headerTitle: () => (
            <HeaderBrand
              eyebrow="TASKS"
              title={(list?.name ?? 'list').toLowerCase()}
            />
          ),
          headerLeft: () => (
            <PressScale
              onPress={() => router.back()}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon name="chevronLeft" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              onPress={() =>
                listId &&
                router.push(`/sheets/new-task?listId=${listId}` as any)
              }
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon name="plus" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 104 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat hero */}
        <View style={styles.heroWrap}>
          <Card
            style={{
              padding: 20,
              paddingRight: 54,
              borderWidth: 0,
              backgroundColor: tilePastel,
              overflow: 'visible',
            }}
          >
            <HeroPactoBadge style={styles.heroBadge} />
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.eyebrow, { color: '#5C4F3D' }]}>
                  {list?.name ?? 'List'}
                </Text>
                <View style={styles.heroNumberRow}>
                  <Text style={[styles.heroNumber, { color: '#2A241B' }]}>
                    {stats.open}
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: '#5C4F3D', marginLeft: 8 },
                    ]}
                  >
                    open
                  </Text>
                </View>
                <Text
                  style={[Typography.caption, { color: '#5C4F3D', marginTop: 6 }]}
                >
                  {stats.done} done · {stats.total} total
                  {stats.overdue ? ` · ${stats.overdue} overdue` : ''}
                </Text>
              </View>
            </View>

            <SegmentedBar open={stats.open} done={stats.done} />

            <View style={styles.barLabels}>
              <Text style={[Typography.eyebrowSm, { color: '#5C4F3D' }]}>
                OPEN {stats.open}
              </Text>
              <Text style={[Typography.eyebrowSm, { color: '#5C4F3D' }]}>
                DONE {stats.done}
              </Text>
              <Text style={[Typography.eyebrowSm, { color: '#5C4F3D' }]}>
                TOTAL {stats.total}
              </Text>
            </View>
          </Card>
        </View>

        {/* Bucketed task rows */}
        <View style={styles.listWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="checkSquare"
              title="Nothing on this list"
              body={`Add the first task for ${list?.name ?? 'this list'}.`}
              actionLabel="Add task"
              onAction={() =>
                listId &&
                router.push(`/sheets/new-task?listId=${listId}` as any)
              }
            />
          ) : (
            <BucketedList
              buckets={buckets}
              rowKey={(t) => t.id}
              renderRow={(t) => (
                <SwipeableRow
                  deleteTitle="Delete task?"
                  deleteMessage={`"${t.title}" will be removed.`}
                  onEdit={() =>
                    router.push(
                      `/sheets/new-task?listId=${listId}&id=${t.id}` as any
                    )
                  }
                  onDelete={() => remove(t.id)}
                >
                  <View
                    style={[
                      styles.row,
                      { backgroundColor: C.bgCard },
                    ]}
                  >
                    <Checkbox
                      checked={t.is_completed}
                      onChange={() => toggleComplete(t)}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          Typography.bodyMedium,
                          {
                            color: t.is_completed ? C.ink3 : C.inkColor,
                            textDecorationLine: t.is_completed
                              ? 'line-through'
                              : 'none',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {t.title}
                      </Text>
                      <View style={styles.metaRow}>
                        {t.due_date ? (
                          <Text
                            style={[
                              Typography.mono,
                              { color: C.ink3, fontSize: 11 },
                            ]}
                          >
                            {t.due_date}
                          </Text>
                        ) : null}
                        <PriorityDot level={priorityLevel(t.priority)} />
                        <ScopeChip
                          scope={scopeFor(t)}
                          mode={mode}
                          partnerName={partnerName}
                        />
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
              )}
            />
          )}
        </View>
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={[
          styles.quickAddWrap,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: C.bg,
            borderTopColor: C.lineColor,
          },
        ]}
      >
        <View
          style={[
            styles.quickAddBar,
            { backgroundColor: C.bgCard, borderColor: C.lineColor },
          ]}
        >
          <TextInput
            testID="task-detail-quickadd-input"
            value={quickAddTitle}
            onChangeText={setQuickAddTitle}
            onSubmitEditing={handleQuickAdd}
            editable={!quickAddSaving}
            placeholder="Add a task"
            placeholderTextColor={C.ink3}
            returnKeyType="send"
            style={[
              styles.quickAddInput,
              Typography.bodyMedium,
              { color: C.inkColor },
            ]}
          />
          <PressScale
            testID="task-detail-quickadd-send"
            onPress={handleQuickAdd}
            disabled={quickAddDisabled}
            accessibilityRole="button"
            accessibilityLabel="Add task"
            style={[
              styles.quickAddSend,
              {
                backgroundColor: quickAddDisabled ? C.bgSoft : C.accent,
                opacity: quickAddDisabled ? 0.58 : 1,
              },
            ]}
          >
            <Icon
              name="send"
              size={17}
              color={quickAddDisabled ? C.ink3 : C.bg}
              strokeWidth={2.3}
            />
          </PressScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SegmentedBar({ open, done }: { open: number; done: number }) {
  const total = Math.max(1, open + done);
  const w = (n: number) => Math.max(4, Math.round((n / total) * 100));
  return (
    <View style={styles.bar}>
      <View
        style={{
          flex: w(open),
          backgroundColor: '#2A241B',
          borderRadius: 3,
          height: 6,
        }}
      />
      <View
        style={{
          flex: w(done),
          backgroundColor: 'rgba(0,0,0,0.18)',
          borderRadius: 3,
          height: 6,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  heroNumber: {
    fontFamily: Typography.pixelFont,
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: -1,
  },
  heroTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    top: -10,
    right: -6,
    zIndex: 3,
  },
  bar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  listWrap: {
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 14,
  },
  quickAddWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickAddBar: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickAddInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
  },
  quickAddSend: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
