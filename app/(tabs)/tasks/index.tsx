import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import {
  ActionEmptyState,
  Card,
  ScreenScaffold,
  SectionHead,
  StatBar,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { useTaskLists, type ListRow } from '@/src/hooks/useTaskLists';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { pastels } from '@/src/lib/tokens';

export default function TasksScreen() {
  return (
    <FeatureRouteGuard featureId="tasks">
      <TasksScreenInner />
    </FeatureRouteGuard>
  );
}

function TasksScreenInner() {
  const { C } = useTheme();
  const { user } = useSession();
  const { lists } = useTaskLists();

  const stats = useMemo(() => {
    const total = lists.reduce((acc, l) => acc + l.total, 0);
    const done = lists.reduce((acc, l) => acc + l.done, 0);
    const open = total - done;
    return { total, done, open, listCount: lists.length };
  }, [lists]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenScaffold horizontalPadding={0}>
        {lists.length > 0 ? (
          <View style={styles.heroWrap}>
            <StatBar
              eyebrow={`${stats.listCount} ${stats.listCount === 1 ? 'LIST' : 'LISTS'}  ·  TASKS`}
              meta="STREAK 14d"
              primary={
                <>
                  <Text
                    style={[Typography.pixelHeroSm, { color: C.inkColor }]}
                    numberOfLines={1}
                  >
                    {stats.open}
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: C.ink2 }]}>open</Text>
                  <Text style={[Typography.caption, { color: C.ink3, marginLeft: 'auto' }]}>
                    {`${stats.done} done · ${stats.total} total`}
                  </Text>
                </>
              }
              microVis={
                <DailyStrip
                  seed={user?.id ? hashSeed(user.id + 'tasks') : 31}
                  fillColor={C.accent}
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
      </ScreenScaffold>
    </View>
  );
}

function ListTile({ list }: { list: ListRow }) {
  const { C } = useTheme();
  const pct = list.total === 0 ? 0 : list.done / list.total;
  const tilePastel = (pastels as any)[list.colorKey] ?? pastels.peach;
  const isDone = pct === 1;
  const open = list.total - list.done;

  return (
    <Card
      onPress={() => router.push(`/(tabs)/tasks/${list.id}` as any)}
      style={[styles.tile, { backgroundColor: C.bgCard, borderColor: C.lineColor }]}
    >
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: tilePastel }]}>
          <Icon name={list.icon} size={18} color="#2A241B" strokeWidth={2} />
        </View>
        <View style={styles.tileCount}>
          <Text style={[styles.tileCountNum, { color: C.inkColor }]}>
            {open}
          </Text>
          <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9 }]}>
            OPEN
          </Text>
        </View>
      </View>
      <Text
        style={[Typography.bodyMedium, { color: C.inkColor, marginTop: 12 }]}
        numberOfLines={2}
      >
        {list.name}
      </Text>
      <View style={styles.tileFooter}>
        <View style={[styles.tileBar, { backgroundColor: C.bgSoft }]}>
          <View
            style={[
              styles.tileBarFill,
              {
                width: `${Math.round(pct * 100)}%`,
                backgroundColor: isDone ? C.accent2 : C.inkColor,
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.tileCountSm,
            { color: C.ink3 },
          ]}
        >
          {list.done}/{list.total}
        </Text>
      </View>
    </Card>
  );
}

function DailyStrip({
  seed,
  fillColor,
  trackColor,
}: {
  seed: number;
  fillColor: string;
  trackColor: string;
}) {
  let s = seed * 9301 + 49297;
  const cells = Array.from({ length: 7 }, () => {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    return r < 0.45 ? 0 : r < 0.7 ? 1 : r < 0.88 ? 2 : 3;
  });
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = (new Date().getDay() + 6) % 7;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {cells.map((w, i) => {
        const a = w === 0 ? 0 : w === 1 ? 0.32 : w === 2 ? 0.6 : 0.92;
        const bg = w === 0 ? trackColor : applyAlpha(fillColor, a);
        const isToday = i === todayIdx;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: '100%',
                aspectRatio: 1,
                borderRadius: 2,
                backgroundColor: bg,
                borderWidth: isToday ? 1.2 : 0,
                borderColor: isToday ? '#2A241B' : 'transparent',
              }}
            />
            <Text style={{ fontFamily: 'GeistMono_500Medium', fontSize: 9, color: '#918875' }}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function applyAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 1000) + 1;
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
  tile: {
    width: '48%',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 138,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCount: {
    alignItems: 'flex-end',
  },
  tileCountNum: {
    fontFamily: Typography.pixelFont,
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: 0,
  },
  tileFooter: {
    marginTop: 'auto',
    paddingTop: 10,
  },
  tileBar: {
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  tileBarFill: {
    height: '100%',
  },
  tileCountSm: {
    fontFamily: Typography.pixelFont,
    fontSize: 12,
    marginTop: 6,
    letterSpacing: 0,
  },
});
