import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import {
  ActionEmptyState,
  ColorTile,
  SectionHead,
  StatBar,
} from '@/src/components/ui/pacto';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { useTaskLists, type ListRow } from '@/src/hooks/useTaskLists';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';

export default function TasksScreen() {
  return (
    <FeatureRouteGuard featureId="tasks">
      <TasksScreenInner />
    </FeatureRouteGuard>
  );
}

function TasksScreenInner() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { lists } = useTaskLists();

  const stats = useMemo(() => {
    const total = lists.reduce((acc, l) => acc + l.total, 0);
    const done = lists.reduce((acc, l) => acc + l.done, 0);
    const open = total - done;
    const completion = total === 0 ? 0 : done / total;
    return { total, done, open, listCount: lists.length, completion };
  }, [lists]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {lists.length > 0 ? (
          <View style={styles.heroWrap}>
            <StatBar
              accent={C.accent2}
              eyebrow={`${stats.listCount} ${stats.listCount === 1 ? 'LIST' : 'LISTS'}  ·  TASKS`}
              meta={stats.total > 0 ? `${Math.round(stats.completion * 100)}% COMPLETE` : undefined}
              primary={
                <>
                  <Text
                    style={[Typography.pixelHeroLg, { color: C.inkColor }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {stats.open}
                  </Text>
                  <Text style={[styles.heroMetricLabel, { color: C.ink2 }]}>open</Text>
                  <Text style={[Typography.caption, { color: C.ink3, marginLeft: 'auto' }]}>
                    {`${stats.done} done · ${stats.total} total`}
                  </Text>
                </>
              }
              microVis={
                <ListProgressStrip
                  lists={lists}
                  fillColor={C.accent}
                  doneColor={C.accent2}
                  trackColor={C.lineColor}
                />
              }
            />
          </View>
        ) : null}

        {/* Lists grid */}
        <View style={styles.section}>
          <SectionHead>Lists</SectionHead>
          {lists.length === 0 ? (
            <ActionEmptyState
              icon="checkSquare"
              title="No lists yet"
              body="Start with one list for errands, chores, or anything that needs a clear next step."
              actionLabel="New list"
              accent={C.accent2}
              onAction={() => router.push('/sheets/new-list' as any)}
            />
          ) : (
            <View style={styles.grid}>
              {lists.map((l) => (
                <ListTile key={l.id} list={l} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ListTile({ list }: { list: ListRow }) {
  const { C } = useTheme();
  const open = list.total - list.done;
  const ratio = list.total === 0 ? 0 : list.done / list.total;
  const bg = (C as Record<string, string>)[list.colorKey] ?? C.bgCard;
  const ink = (C as Record<string, string>)[`${list.colorKey}Ink`] ?? C.inkColor;
  const tone = { bg, ink, muted: alphaColor(ink, 0.66) };
  const scopeLabel = list.scope === 'personal'
    ? 'Personal task list'
    : list.scope === 'shared'
      ? 'Shared task list'
      : null;
  const scopeIcon: IconName | null = list.scope === 'personal'
    ? 'lock'
    : list.scope === 'shared'
      ? 'users'
      : null;

  return (
    <ColorTile
      tone={tone}
      title={list.name}
      stat={open}
      statLabel={`${list.done}/${list.total} DONE`}
      dotsTotal={7}
      dotsFilled={Math.round(ratio * 7)}
      onPress={() => router.push(`/(tabs)/us/tasks/${list.id}` as any)}
      accessibilityLabel={`${list.name}, ${scopeLabel ? `${scopeLabel}, ` : ''}${open} open, ${list.done} done, ${list.total} total`}
      accessibilityHint="Open this task list"
      topRight={
        scopeLabel && scopeIcon ? (
          <View
            testID={`task-list-scope-${list.id}`}
            accessibilityLabel={scopeLabel}
            accessibilityRole="image"
            style={[
              styles.scopeBadge,
              {
                backgroundColor: alphaColor(ink, 0.14),
                borderColor: alphaColor(ink, 0.2),
              },
            ]}
          >
            <Icon name={scopeIcon} size={14} color={ink} strokeWidth={2.4} />
          </View>
        ) : null
      }
    />
  );
}

function ListProgressStrip({
  lists,
  fillColor,
  doneColor,
  trackColor,
}: {
  lists: ListRow[];
  fillColor: string;
  doneColor: string;
  trackColor: string;
}) {
  const cells = lists.slice(0, 8).map((list) => {
    if (list.total === 0) return { label: list.name, ratio: 0, empty: true };
    return { label: list.name, ratio: list.done / list.total, empty: false };
  });

  if (cells.length === 0) return null;

  return (
    <View
      style={styles.progressStrip}
      accessibilityLabel={`Task list completion: ${cells
        .map((c) => `${c.label} ${Math.round(c.ratio * 100)} percent`)
        .join(', ')}`}
    >
      {cells.map((cell, i) => {
        const bg = cell.empty
          ? trackColor
          : cell.ratio >= 1
          ? doneColor
          : alphaColor(fillColor, Math.max(0.24, cell.ratio));
        return (
          <View key={`${cell.label}-${i}`} style={styles.progressCell}>
            <View
              style={{
                width: '100%',
                height: 10,
                borderRadius: 2,
                backgroundColor: bg,
                borderWidth: cell.empty ? 1 : 0,
                borderColor: trackColor,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  section: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroMetricLabel: {
    fontFamily: Typography.geistSemiBoldFont,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: 0,
  },
  progressStrip: {
    flexDirection: 'row',
    gap: 4,
  },
  progressCell: {
    flex: 1,
    minWidth: 0,
  },
  scopeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
