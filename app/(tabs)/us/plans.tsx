import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  HeaderBrand,
  PulsingDot,
  SegmentedTabs,
  PriorityDot,
  StatBar,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { usePlans } from '@/src/hooks/usePlans';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type PlanStatus = 'active' | 'planning' | 'done' | 'paused';

type PlanRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  targetDate: string | null;
  budget: number | null;
  status: PlanStatus;
  priority: number;
  icon: IconName;
  daysUntil: number | null;
};

type FilterKey = 'all' | 'active' | 'planning' | 'done';

const VALID_ICON_NAMES: ReadonlySet<IconName> = new Set<IconName>([
  'compass',
  'mapPin',
  'flag',
  'gift',
  'heart',
  'star',
  'home',
  'coffee',
  'briefcase',
  'camera',
  'music',
  'book',
  'feather',
  'sparkle',
  'sun',
  'moon',
]);

function resolvePlanIcon(value: string | null | undefined): IconName {
  if (value && VALID_ICON_NAMES.has(value as IconName)) return value as IconName;
  return 'compass';
}

function statusOf(raw: string | null | undefined): PlanStatus {
  if (raw === 'planning' || raw === 'done' || raw === 'paused') return raw;
  return 'active';
}

export default function PlansScreen() {
  return (
    <FeatureRouteGuard featureId="goals">
      <PlansScreenInner />
    </FeatureRouteGuard>
  );
}

function PlansScreenInner() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { mode } = useSession();
  const { plans, remove } = usePlans();

  const [filter, setFilter] = useState<FilterKey>('all');

  const eyebrowLabel =
    mode === 'solo' ? 'ME' : mode === 'crew' ? 'CREW' : 'US';

  const rows = useMemo<PlanRow[]>(() => {
    const today = new Date();
    return plans.map((p: any): PlanRow => {
      const targetDate = (p.targetDate as string | null) ?? null;
      let daysUntil: number | null = null;
      if (targetDate) {
        try {
          daysUntil = differenceInCalendarDays(parseISO(targetDate), today);
        } catch {
          daysUntil = null;
        }
      }
      return {
        id: String(p.id),
        title: String(p.title ?? ''),
        description: (p.description as string | null) ?? null,
        category: (p.category as string | null) ?? null,
        targetDate,
        budget: typeof p.budget === 'number' ? p.budget : null,
        status: statusOf(p.status),
        priority: Number(p.priority ?? 0),
        icon: resolvePlanIcon(p.icon),
        daysUntil,
      };
    });
  }, [plans]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'active').length;
    const planning = rows.filter((r) => r.status === 'planning').length;
    const done = rows.filter((r) => r.status === 'done').length;
    const featured = rows
      .filter(
        (r) =>
          (r.status === 'active' || r.status === 'planning') &&
          r.daysUntil != null &&
          r.daysUntil >= 0
      )
      .slice()
      .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0))[0];
    return { active, planning, done, total: rows.length, featured };
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'active') return r.status === 'active';
      if (filter === 'planning') return r.status === 'planning';
      if (filter === 'done') return r.status === 'done';
      return true;
    });
  }, [rows, filter]);

  const buckets = useMemo<Bucket<PlanRow>[]>(() => {
    const groups: Record<string, PlanRow[]> = {
      Active: [],
      Planning: [],
      Done: [],
      Paused: [],
    };
    for (const r of visible) {
      const label =
        r.status === 'active'
          ? 'Active'
          : r.status === 'planning'
          ? 'Planning'
          : r.status === 'done'
          ? 'Done'
          : 'Paused';
      groups[label].push(r);
    }
    const order = ['Active', 'Planning', 'Paused', 'Done'];
    const dotMap: Record<string, string> = {
      Active: C.accent,
      Planning: C.accent2,
      Paused: C.ink2,
      Done: C.ink3,
    };
    return order
      .filter((k) => groups[k]?.length)
      .map((k) => ({
        label: k,
        dotColor: dotMap[k],
        rows: groups[k]
          .slice()
          .sort((a, b) => {
            // Upcoming targets first, then by priority desc
            const ad = a.daysUntil ?? Infinity;
            const bd = b.daysUntil ?? Infinity;
            if (ad !== bd) return ad - bd;
            return b.priority - a.priority;
          }),
      }));
  }, [visible, C.accent, C.accent2, C.ink2, C.ink3]);

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'planning', label: 'Planning' },
    { key: 'done', label: 'Done' },
  ];

  const priorityLevel = (p: number): 'none' | 'low' | 'med' | 'high' =>
    p >= 3 ? 'high' : p === 2 ? 'med' : p === 1 ? 'low' : 'none';

  const heroEyebrow = stats.featured?.daysUntil != null
    ? stats.featured.daysUntil === 0
      ? 'NEXT · TODAY'
      : stats.featured.daysUntil === 1
      ? 'NEXT · TOMORROW'
      : `NEXT · IN ${stats.featured.daysUntil} DAYS`
    : stats.active > 0
    ? `${stats.active} ACTIVE`
    : 'DREAM SOMETHING UP';
  const heroTitle = stats.featured?.title ?? 'Goals';

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
            <HeaderBrand eyebrow={eyebrowLabel} title="goals" />
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
              onPress={() => router.push('/sheets/new-plan' as any)}
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
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — slim status row + pipeline ribbon */}
        <View style={styles.heroWrap}>
          <StatBar
            eyebrow={heroEyebrow}
            meta={
              stats.featured
                ? `${stats.featured.targetDate ? format(parseISO(stats.featured.targetDate), 'MMM d') : 'NO DATE'}${stats.featured.category ? ` · ${stats.featured.category.toUpperCase()}` : ''}`
                : undefined
            }
            primary={
              <>
                <Text
                  style={[Typography.pixelHeroSm, { color: C.inkColor }]}
                  numberOfLines={1}
                >
                  {heroTitle}
                </Text>
                {stats.featured ? <PulsingDot color={C.accent2} /> : null}
                <Text
                  style={[Typography.mono, { color: C.ink3, marginLeft: 'auto', fontSize: 11 }]}
                  numberOfLines={1}
                >
                  {stats.active} active · {stats.planning} planning · {stats.done} done
                </Text>
              </>
            }
            microVis={
              <View style={styles.pipelineBar}>
                {(() => {
                  const total = Math.max(1, stats.active + stats.planning + stats.done);
                  const seg = (n: number) => Math.max(4, Math.round((n / total) * 100));
                  return (
                    <>
                      <View
                        style={{
                          flex: seg(stats.active),
                          backgroundColor: C.inkColor,
                          borderRadius: 4,
                          height: 6,
                        }}
                      />
                      <View
                        style={{
                          flex: seg(stats.planning),
                          backgroundColor: C.ink3,
                          borderRadius: 4,
                          height: 6,
                        }}
                      />
                      <View
                        style={{
                          flex: seg(stats.done),
                          backgroundColor: C.lineColor,
                          borderRadius: 4,
                          height: 6,
                        }}
                      />
                    </>
                  );
                })()}
              </View>
            }
          />
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          <SegmentedTabs<FilterKey>
            value={filter}
            onChange={setFilter}
            options={filterOptions.map((f) => ({ key: f.key, label: f.label }))}
          />
        </View>

        {/* Bucketed list */}
        <View style={styles.listWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="compass"
              title="No goals yet"
              body="Set a trip, project, habit, or shared priority worth tracking."
              actionLabel="New goal"
              onAction={() => router.push('/sheets/new-plan' as any)}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              rowKey={(p) => p.id}
              renderRow={(p) => (
                <SwipeableRow
                  deleteTitle="Delete goal?"
                  deleteMessage={`"${p.title}" will be removed.`}
                  onEdit={() =>
                    router.push(`/sheets/new-plan?id=${p.id}` as any)
                  }
                  onDelete={() => remove(p.id)}
                >
                  <View
                    style={[
                      styles.row,
                      { backgroundColor: C.bgCard },
                      p.status === 'done' ? { opacity: 0.7 } : null,
                    ]}
                  >
                    <View style={[styles.iconTile, { backgroundColor: C.accent2Soft }]}>
                      <Icon
                        name={p.icon}
                        size={16}
                        color={C.accent2}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.headRow}>
                        <Text
                          style={[
                            Typography.bodyMedium,
                            {
                              color: p.status === 'done' ? C.ink3 : C.inkColor,
                              flex: 1,
                              textDecorationLine:
                                p.status === 'done' ? 'line-through' : 'none',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {p.title}
                        </Text>
                        {p.status !== 'done' ? (
                          <View
                            style={[
                              styles.statusChip,
                              {
                                backgroundColor:
                                  p.status === 'active'
                                    ? C.accentSoft
                                    : p.status === 'planning'
                                    ? C.accent2Soft
                                    : C.bgSoft,
                                borderColor:
                                  p.status === 'active'
                                    ? C.accent
                                    : p.status === 'planning'
                                    ? C.accent2
                                    : C.lineColor,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                {
                                  backgroundColor:
                                    p.status === 'active'
                                      ? C.accent
                                      : p.status === 'planning'
                                      ? C.accent2
                                      : C.ink3,
                                },
                              ]}
                            />
                            <Text
                              style={[
                                Typography.eyebrowSm,
                                {
                                  color:
                                    p.status === 'active'
                                      ? C.accent
                                      : p.status === 'planning'
                                      ? C.accent2
                                      : C.ink2,
                                  fontSize: 9,
                                },
                              ]}
                            >
                              {p.status.toUpperCase()}
                            </Text>
                          </View>
                        ) : null}
                        <PriorityDot level={priorityLevel(p.priority)} />
                      </View>
                      {p.description ? (
                        <Text
                          style={[Typography.caption, { color: C.ink2, marginTop: 2 }]}
                          numberOfLines={2}
                        >
                          {p.description}
                        </Text>
                      ) : null}
                      <View style={styles.metaRow}>
                        {p.targetDate ? (
                          <Text
                            style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}
                          >
                            {format(parseISO(p.targetDate), 'MMM d, yyyy')}
                          </Text>
                        ) : null}
                        {p.daysUntil != null && p.status !== 'done' ? (
                          <Text
                            style={[
                              Typography.eyebrowSm,
                              {
                                color: p.daysUntil < 0 ? C.error : C.accent,
                                fontSize: 9.5,
                              },
                            ]}
                          >
                            {p.daysUntil < 0
                              ? `${Math.abs(p.daysUntil)}D OVERDUE`
                              : p.daysUntil === 0
                              ? 'TODAY'
                              : `IN ${p.daysUntil}D`}
                          </Text>
                        ) : null}
                        {p.category ? (
                          <Text
                            style={[
                              Typography.eyebrowSm,
                              { color: C.ink3, fontSize: 9.5 },
                            ]}
                          >
                            · {p.category.toUpperCase()}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  pipelineBar: {
    flexDirection: 'row',
    gap: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  filterRow: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 6,
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
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
});
