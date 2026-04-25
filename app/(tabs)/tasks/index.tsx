// app/(tabs)/tasks/index.tsx
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Display, Overline, Pill, ProgressRing } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { ListCard, ListCardSkeleton } from '@/src/components/tasks/ListCard';
import { useActionMenu } from '@/src/components/ui/ActionMenu';
import { confirmDestructive } from '@/src/lib/confirm';
import { useTaskLists, type ListRow } from '@/src/hooks/useTaskLists';
import { useTheme } from '@/src/lib/theme';

const BASE_FILTERS = ['All'] as const;

export default function TasksList() {
  const { C, F } = useTheme();
  const { lists, isLoading, error, remove } = useTaskLists();
  const actionMenu = useActionMenu();
  const [filter, setFilter] = useState<string>('All');
  const [dismissedError, setDismissedError] = useState(false);

  const openListMenu = useCallback(
    (list: ListRow) => {
      actionMenu.open({
        title: list.name,
        subtitle: list.category ?? undefined,
        actions: [
          {
            key: 'edit',
            label: 'Edit',
            icon: 'edit',
            onPress: () => router.push(`/sheets/new-list?id=${list.id}` as any),
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: 'trash',
            destructive: true,
            onPress: () => {
              confirmDestructive(
                'Delete list?',
                `"${list.name}" and all its tasks will be removed.`,
                () => remove(list.id),
              );
            },
          },
        ],
      });
    },
    [actionMenu, remove],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    lists.forEach((l) => { if (l.category) set.add(l.category); });
    return Array.from(set).sort();
  }, [lists]);

  const filters = useMemo(() => [...BASE_FILTERS, ...categories], [categories]);

  const visible = useMemo<ListRow[]>(() => {
    if (filter === 'All') return lists;
    return lists.filter((l) => l.category === filter);
  }, [lists, filter]);

  const totalDone = lists.reduce((a, l) => a + l.done, 0);
  const totalAll = lists.reduce((a, l) => a + l.total, 0);
  const pct = totalAll === 0 ? 0 : totalDone / totalAll;

  if (error && !dismissedError) {
    return <ErrorState onRetry={() => setDismissedError(true)} />;
  }
  if (isLoading && lists.length === 0) return <IndexSkeleton />;

  return (
    <Screen>
      <HeroCard done={totalDone} total={totalAll} pct={pct} listCount={lists.length} />

      {filters.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
            {filters.map((f) => (
              <Pill
                key={f}
                testID={`task-filter-${f}`}
                active={filter === f}
                activeBg={C.tasks}
                activeColor="#fff"
                onPress={() => setFilter(f)}
              >
                {f}
              </Pill>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {lists.length === 0 ? (
        <EmptyLists />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {visible.map((l, i) => (
            <ListCard
              key={l.id}
              list={l}
              index={i}
              onPress={() => router.push(`/tasks/${l.id}` as any)}
              onLongPress={() => openListMenu(l)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function HeroCard({
  done,
  total,
  pct,
  listCount,
}: { done: number; total: number; pct: number; listCount: number }) {
  const { C, F } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(0).duration(420).springify().damping(18)}
      style={{
        marginBottom: 16,
        backgroundColor: C.mint,
        borderRadius: 22,
        padding: 22,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Overline color="rgba(15,44,26,0.7)">Getting done</Overline>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 6 }}>
            <Display size={54} color={C.mintInk}>{`${done}`}</Display>
            <Text
              style={{
                fontSize: 22,
                fontFamily: F.displayBold,
                color: 'rgba(15,44,26,0.55)',
                marginBottom: 8,
              }}
            >
              /{total}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: 'rgba(15,44,26,0.75)',
              marginTop: 4,
              fontFamily: F.body,
            }}
          >
            {listCount === 0 ? 'no lists yet' : `across ${listCount} ${listCount === 1 ? 'list' : 'lists'} · doing great.`}
          </Text>
        </View>
        <ProgressRing
          size={80}
          stroke={8}
          value={pct}
          colors={[C.mintInk, C.mintInk]}
          bg="rgba(15,44,26,0.2)"
          label={`${Math.round(pct * 100)}%`}
          labelColor={C.mintInk}
        />
      </View>
    </Animated.View>
  );
}

function EmptyLists() {
  const { C, F } = useTheme();
  return (
    <View
      testID="tasks-empty"
      style={{
        marginTop: 18,
        padding: 22,
        borderRadius: 22,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: C.line,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Icon name="checkSquare" size={22} color={C.fog} />
      <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
        No lists yet
      </Text>
      <Text style={{ fontSize: 12, color: C.fog, fontFamily: F.body, textAlign: 'center' }}>
        Tap + in the header to create your first list.
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { C, F } = useTheme();
  return (
    <Screen>
      <Pressable testID="tasks-error-retry" onPress={onRetry}>
        <View
          style={{
            backgroundColor: C.rose,
            borderRadius: 22,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontFamily: F.bodyBold,
              fontSize: 10,
              letterSpacing: 1.4,
              color: 'rgba(0,0,0,0.6)',
              textTransform: 'uppercase',
            }}
          >
            Couldn't load tasks
          </Text>
          <Text style={{ color: C.ink, fontFamily: F.body, marginTop: 4 }}>
            Tap to retry
          </Text>
        </View>
      </Pressable>
    </Screen>
  );
}

function IndexSkeleton() {
  const { C } = useTheme();
  return (
    <Screen>
      <Animated.View
        entering={FadeInDown.duration(360)}
        testID="tasks-hero-skeleton"
        style={{
          marginBottom: 16,
          backgroundColor: C.mint,
          borderRadius: 22,
          height: 138,
          opacity: 0.6,
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <ListCardSkeleton key={i} index={i} />
        ))}
      </View>
    </Screen>
  );
}
