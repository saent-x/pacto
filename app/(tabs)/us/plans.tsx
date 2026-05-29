import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  HeaderBrand,
  PulsingDot,
  SegmentedTabs,
  PriorityPill,
  priorityLevelFromNumber,
  ScopeChip,
  StatBar,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { usePlans } from '@/src/hooks/usePlans';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { TARGET_COLOR_KEYS, colorValueForKey, resolveColorKey } from '@/src/lib/color-cycle';
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
  color: string;
  isPrivate: boolean;
  daysUntil: number | null;
};

type FilterKey = 'all' | 'active' | 'planning' | 'done';

function statusOf(raw: string | null | undefined): PlanStatus {
  if (raw === 'planning' || raw === 'done' || raw === 'paused') return raw;
  return 'active';
}

function parseTargetDate(value: string | null): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
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
      const rawTargetDate = (p.targetDate as string | null) ?? null;
      const parsedTargetDate = parseTargetDate(rawTargetDate);
      const targetDate = parsedTargetDate ? rawTargetDate : null;
      let daysUntil: number | null = null;
      if (parsedTargetDate) {
        daysUntil = differenceInCalendarDays(parsedTargetDate, today);
      }
      const colorKey = resolveColorKey(p, TARGET_COLOR_KEYS, C);
      return {
        id: String(p.id),
        title: String(p.title ?? ''),
        description: (p.description as string | null) ?? null,
        category: (p.category as string | null) ?? null,
        targetDate,
        budget: typeof p.budget === 'number' ? p.budget : null,
        status: statusOf(p.status),
        priority: Number(p.priority ?? 0),
        color: colorKey
          ? colorValueForKey(C, colorKey)
          : typeof p.color === 'string' && p.color.trim()
            ? p.color
            : C.accent2,
        isPrivate: p.isPrivate === true,
        daysUntil,
      };
    });
  }, [plans, C]);

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

const heroEyebrow = stats.featured?.daysUntil != null
    ? stats.featured.daysUntil === 0
      ? 'NEXT · TODAY'
      : stats.featured.daysUntil === 1
      ? 'NEXT · TOMORROW'
      : `NEXT · IN ${stats.featured.daysUntil} DAYS`
    : stats.active > 0
    ? `${stats.active} ACTIVE`
    : 'DREAM SOMETHING UP';
  const heroTitle = stats.featured?.title ?? 'Targets';

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
            <HeaderBrand eyebrow={eyebrowLabel} title="targets" />
          ),
          headerLeft: () => (
            <PressScale
              onPress={() => router.back()}
              hitSlop={12}
              haptic="impact"
              pressedScale={0.96}
              style={{ padding: 4 }}
            >
              <Icon name="chevronLeft" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              onPress={() => router.push('/sheets/new-plan' as any)}
              hitSlop={12}
              haptic="impact"
              pressedScale={0.96}
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
            accent={C.plans}
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
              title="No targets yet"
              body="Set a trip, project, habit, or shared priority worth tracking."
              actionLabel="New target"
              accent={C.plans}
              onAction={() => router.push('/sheets/new-plan' as any)}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              presentation="items"
              swipeableRows
              rowKey={(p) => p.id}
              renderRow={(p) => {
                const hasTextBeforeCategory = Boolean(
                  p.description ||
                    p.targetDate ||
                    (p.daysUntil != null && p.status !== 'done'),
                );

                return (
                  <SwipeableRow
                    deleteTitle="Delete target?"
                    deleteMessage={`"${p.title}" will be removed.`}
                    onEdit={() =>
                      router.push(`/sheets/new-plan?id=${p.id}` as any)
                    }
                    onDelete={() => remove(p.id)}
                  >
                    <View
                      style={[
                        styles.row,
                        p.status === 'done' ? { opacity: 0.7 } : null,
                      ]}
                    >
                      <View
                        testID={`target-status-dot-${p.id}`}
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
                        </View>
                        <View style={styles.metaRow}>
                          {p.description ? (
                            <Text
                              style={[
                                Typography.caption,
                                { color: C.ink2, flexShrink: 1 },
                              ]}
                              numberOfLines={1}
                            >
                              {p.description}
                            </Text>
                          ) : null}
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
                          <PriorityPill level={priorityLevelFromNumber(p.priority)} />
                          <ScopeChip
                            scope={p.isPrivate ? 'mine' : 'shared'}
                            mode={mode}
                          />
                          {p.category ? (
                            <Text
                              style={[
                                Typography.eyebrowSm,
                                {
                                  color: C.ink3,
                                  fontSize: 9.5,
                                  lineHeight: 18,
                                  textAlignVertical: 'center',
                                },
                              ]}
                            >
                              {hasTextBeforeCategory ? '· ' : ''}
                              {p.category.toUpperCase()}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </SwipeableRow>
                );
              }}
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
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
    borderRadius: 8,
    borderWidth: 1,
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
