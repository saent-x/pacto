import React from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { PriorityPill, priorityLevelFromNumber } from '@/src/components/ui/pacto';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { routeForTimelineItem } from '@/src/lib/homeNavigation';
import type { TimelineItem } from '@/src/lib/home/types';
import { useTheme } from '@/src/lib/theme';

type ThemeColors = ReturnType<typeof useTheme>['C'];

function timeLabel(occursAt: number | null): string {
  if (!occursAt) return 'SOON';
  const date = new Date(occursAt);
  return format(date, 'h:mma').toLowerCase();
}

function timelineSourceLabel(type: TimelineItem['type']): string {
  switch (type) {
    case 'task':
      return 'Task from Tasks';
    case 'plan':
      return 'Target from Targets';
    case 'event':
      return 'Event from Calendar';
    case 'ritual':
      return 'Routine from Recurring';
    case 'memory':
      return 'Memory';
    case 'reminder':
    default:
      return 'Reminder from Recurring';
  }
}

export interface HomeUpNextProps {
  C: ThemeColors;
  homePanelBg: string;
  homePanelBorder: string;
  homePanelHairline: string;
  goalsEnabled: boolean;
  nextRows: TimelineItem[];
  isFeatureEnabled: (feature: any) => boolean;
}

const HomeUpNext = React.memo(function HomeUpNext({
  C,
  homePanelBg,
  homePanelBorder,
  homePanelHairline,
  goalsEnabled,
  nextRows,
  isFeatureEnabled,
}: HomeUpNextProps) {
  return (
    <View
      style={[
        styles.mergedListSection,
        { backgroundColor: homePanelBg, borderTopColor: homePanelBorder },
      ]}
    >
      <View style={styles.mergedListHead}>
        <Text style={[Typography.eyebrow, { color: C.ink3 }]}>UP NEXT</Text>
        {goalsEnabled ? (
          <PressScale
            testID="home-coming-all"
            onPress={() => router.push('/(tabs)/us/plans' as any)}
            hitSlop={8}
          >
            <Text style={[Typography.captionMedium, { color: C.accent }]}>See all</Text>
          </PressScale>
        ) : null}
      </View>

      {nextRows.length === 0 ? (
        goalsEnabled ? (
          <PressScale
            testID="home-timeline-empty"
            onPress={() => router.push('/sheets/new-plan' as any)}
            haptic="impact"
            pressedScale={0.98}
            style={styles.homeListRow}
          >
            <View style={[styles.nextCircle, { borderColor: homePanelBorder }]} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>No items dated today</Text>
              <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]}>Schedule a target</Text>
            </View>
            <View style={[styles.nextPill, { backgroundColor: C.accentSoft }]}>
              <Text style={[Typography.eyebrowSm, { color: C.accent }]}>NEW</Text>
            </View>
          </PressScale>
        ) : (
          <View testID="home-timeline-empty" style={styles.homeListRow}>
            <View style={[styles.nextCircle, { borderColor: homePanelBorder }]} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>No items dated today</Text>
              <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]}>Nothing from enabled features is scheduled for today.</Text>
            </View>
          </View>
        )
      ) : nextRows.map((row, index) => {
        const route = routeForTimelineItem(row, isFeatureEnabled);
        const isDone = !!row.isCompleted;
        return (
          <View
            key={row.id}
            testID={`home-timeline-${row.type}-${row.sourceId}`}
            onStartShouldSetResponder={() => !!route}
            onResponderRelease={() => {
              if (route) router.push(route as any);
            }}
            style={[
              styles.homeListRow,
              index > 0 ? { borderTopColor: homePanelHairline, borderTopWidth: 1 } : null,
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[
                  Typography.bodyMedium,
                  {
                    color: isDone ? C.ink3 : C.inkColor,
                    textDecorationLine: isDone ? 'line-through' : 'none',
                  },
                ]}
                numberOfLines={1}
              >
                {row.title}
              </Text>
              <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]} numberOfLines={1}>
                {timeLabel(row.occursAt)} · {row.subtitle ?? timelineSourceLabel(row.type)}
              </Text>
            </View>
            <PriorityPill level={priorityLevelFromNumber(row.priority)} compact />
            <View style={[styles.nextPill, { backgroundColor: isDone ? C.accent2Soft : C.accentSoft }]}>
              <Text style={[Typography.eyebrowSm, { color: isDone ? C.accent2 : C.accent }]}>
                {isDone ? 'DONE' : row.occursAt ? 'TODAY' : 'SOON'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  mergedListSection: {
    paddingTop: 12,
    paddingHorizontal: 0,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mergedListHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  homeListRow: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
});

export default HomeUpNext;
