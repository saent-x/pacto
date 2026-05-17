import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  ScopeChip,
} from '@/src/components/ui/pacto';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useCalendar } from '@/src/lib/calendar/context';
import {
  addDaysIso,
  formatAgendaDayHeader,
  formatAgendaTime,
  type WeekDay,
} from '@/src/lib/calendar/builders';
import type { TimelineItem } from '@/src/lib/home/types';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Slot = 'allday' | 'morning' | 'afternoon' | 'evening';

export default function CalendarScreen() {
  return (
    <FeatureRouteGuard featureId="calendar">
      <CalendarScreenInner />
    </FeatureRouteGuard>
  );
}

function CalendarScreenInner() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { mode, partner } = useSession();
  const cal = useCalendar();
  const { week, agenda, monthLabel, selectedDate, selectDate } = cal;

  // Honor `?date=YYYY-MM-DD` so other surfaces can deep-link a specific day.
  const params = useLocalSearchParams<{ date?: string }>();
  useEffect(() => {
    const target = Array.isArray(params.date) ? params.date[0] : params.date;
    if (target && /^\d{4}-\d{2}-\d{2}$/.test(target) && target !== selectedDate) {
      selectDate(target);
    }
  }, [params.date, selectDate, selectedDate]);

  const partnerName = partner?.displayName ?? null;

  const heroCaption = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (selectedDate === today) return 'Today';
    return formatAgendaDayHeader(selectedDate);
  }, [selectedDate]);

  const buckets = useMemo<Bucket<TimelineItem>[]>(() => {
    const groups: Record<Slot, TimelineItem[]> = {
      allday: [],
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const item of agenda) {
      const slot = bucketOfTimelineItem(item);
      groups[slot].push(item);
    }
    const dotMap: Record<Slot, string> = {
      allday: C.accent2,
      morning: C.accent3,
      afternoon: C.ink2,
      evening: C.accent,
    };
    const labelMap: Record<Slot, string> = {
      allday: 'All day',
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
    };
    return (Object.keys(groups) as Slot[])
      .filter((k) => groups[k].length > 0)
      .map((k) => ({
        label: labelMap[k],
        dotColor: dotMap[k],
        rows: groups[k].slice().sort(byOccursAt),
      }));
  }, [agenda, C.accent, C.accent2, C.accent3, C.ink2]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Lean week strip */}
        <View style={styles.weekWrap}>
          <View style={styles.weekHeader}>
            <View style={styles.weekNav}>
              <PressScale
                hitSlop={10}
                onPress={() => selectDate(addDaysIso(selectedDate, -7))}
                style={styles.weekNavBtn}
              >
                <Icon name="chevronLeft" size={16} color={C.ink2} strokeWidth={2.2} />
              </PressScale>
              <Text style={[Typography.captionMedium, { color: C.ink2 }]}>
                {monthLabel}
              </Text>
              <PressScale
                hitSlop={10}
                onPress={() => selectDate(addDaysIso(selectedDate, 7))}
                style={styles.weekNavBtn}
              >
                <Icon name="chevronRight" size={16} color={C.ink2} strokeWidth={2.2} />
              </PressScale>
            </View>
            <PressScale
              hitSlop={10}
              onPress={() => selectDate(new Date().toISOString().slice(0, 10))}
              style={[styles.todayBtn, { backgroundColor: C.bgSoft, borderColor: C.lineColor }]}
            >
              <Text style={[Typography.captionMedium, { color: C.ink2 }]}>Today</Text>
            </PressScale>
          </View>
          <View style={styles.weekStrip}>
            {week.map((d, i) => (
              <DayCell
                key={d.date}
                day={d}
                label={DAY_LABELS[i]}
                onPress={() => selectDate(d.date)}
              />
            ))}
          </View>
        </View>

        {/* Day agenda — bucketed */}
        <View style={styles.agendaWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="calendar"
              title={heroCaption}
              body="Nothing on the books for this day."
              actionLabel="Add reminder"
              onAction={() => router.push('/sheets/new-reminder' as any)}
              accent={C.accent2}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              rowKey={(item) => item.id}
              renderRow={(item) => (
                <View style={[styles.row, styles.rowPadding, { backgroundColor: C.bgCard }]}>
                  <View
                    style={[
                      styles.iconTile,
                      { backgroundColor: C.bgSoft, borderColor: C.lineColor },
                    ]}
                  >
                    <Icon
                      name={iconForType(item.type)}
                      size={16}
                      color={C.ink2}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[Typography.bodyMedium, { color: C.inkColor }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>
                        {item.occursAt
                          ? formatAgendaTime(item.occursAt)
                          : 'all day'}
                      </Text>
                      <ScopeChip
                        scope={
                          item.isPrivate
                            ? 'mine'
                            : (item as any).assignedToPartner
                            ? 'partner'
                            : 'shared'
                        }
                        mode={mode}
                        partnerName={partnerName}
                      />
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DayCell({
  day,
  label,
  onPress,
}: {
  day: WeekDay;
  label: string;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const selected = day.isSelected;
  const today = day.isToday;

  const numColor = selected
    ? C.bg
    : today
    ? C.accent
    : C.inkColor;

  const labelColor = selected ? C.bg : C.ink3;
  const dotColor = selected ? C.bg : C.accent;

  return (
    <PressScale
      testID={`calendar-day-${day.date}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.dayCell,
        selected ? { backgroundColor: C.inkColor } : null,
      ]}
    >
      <Text style={[Typography.eyebrowSm, { color: labelColor, fontSize: 9.5 }]}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: Typography.geistSemiBoldFont,
          fontSize: 16,
          color: numColor,
          marginTop: 4,
          fontWeight: today || selected ? '600' : '400',
        }}
      >
        {day.dayNum}
      </Text>
      <View style={styles.dayDotRow}>
        {day.hasEvent ? (
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 999,
              backgroundColor: dotColor,
              opacity: selected ? 0.85 : 1,
            }}
          />
        ) : null}
      </View>
    </PressScale>
  );
}

function bucketOfTimelineItem(item: TimelineItem): Slot {
  if (!item.occursAt) return 'allday';
  const h = new Date(item.occursAt).getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function byOccursAt(a: TimelineItem, b: TimelineItem) {
  return (a.occursAt ?? 0) - (b.occursAt ?? 0);
}

function iconForType(type: TimelineItem['type']): IconName {
  switch (type) {
    case 'task':
      return 'checkSquare';
    case 'reminder':
      return 'bell';
    case 'plan':
    case 'event':
      return 'calendar';
    case 'ritual':
      return 'repeat';
    case 'memory':
      return 'bookmark';
    default:
      return 'clock';
  }
}

const styles = StyleSheet.create({
  weekWrap: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  dayDotRow: {
    height: 6,
    marginTop: 4,
    flexDirection: 'row',
    gap: 2,
  },
  agendaWrap: {
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowPadding: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
});
