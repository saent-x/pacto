import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ColorTile, type Tone } from '@/src/components/ui/pacto';
import { useTheme } from '@/src/lib/theme';

type ThemeColors = ReturnType<typeof useTheme>['C'];

export interface HomeQuickStatsProps {
  C: ThemeColors;
  homePanelBorder: string;
  homeTintTone: (accent: string) => Tone;
  taskStat: string;
  taskStatLabel: string;
  reminderCount: number;
  activityStreak: number;
}

const HomeQuickStats = React.memo(function HomeQuickStats({
  C,
  homePanelBorder,
  homeTintTone,
  taskStat,
  taskStatLabel,
  reminderCount,
  activityStreak,
}: HomeQuickStatsProps) {
  return (
    <View style={styles.mergedRailRow}>
      <ColorTile
        tone={homeTintTone(C.mint)}
        title="Tasks this week"
        icon="checkSquare"
        stat={taskStat}
        statLabel={taskStatLabel}
        style={[
          styles.mergedRailSegment,
          { borderRightColor: homePanelBorder, borderRightWidth: 1 },
        ]}
      />
      <ColorTile
        tone={homeTintTone(C.sky)}
        title={`${reminderCount} reminders tracked`}
        icon="clock"
        stat={activityStreak}
        statLabel="STREAK · DAYS"
        style={styles.mergedRailSegment}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  mergedRailRow: {
    flexDirection: 'row',
  },
  mergedRailSegment: {
    flex: 1,
    width: 'auto',
    minHeight: 132,
    padding: 12,
    borderRadius: 0,
    borderWidth: 0,
  },
});

export default HomeQuickStats;
