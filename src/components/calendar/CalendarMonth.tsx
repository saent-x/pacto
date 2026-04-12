import type { CalendarDay } from "@/src/lib/home/types";

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BorderRadius, Spacing } from "@/src/constants/spacing";
import { Typography } from "@/src/constants/typography";
import { useColors } from "@/src/hooks/useColors";

type Props = {
  monthLabel: string;
  days: CalendarDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function markerColor(
  kind: CalendarDay["kinds"][number],
  colors: ReturnType<typeof useColors>,
) {
  switch (kind) {
    case "event":
      return colors.info;
    case "plan":
      return colors.plans;
    case "reminder":
      return colors.reminders;
    case "task":
      return colors.tasks;
    case "milestone":
      return colors.milestones;
    default:
      return colors.textTertiary;
  }
}

export function CalendarMonth({
  monthLabel,
  days,
  selectedDate,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Calendar</Text>
          <Text style={[styles.title, { color: colors.text }]}>{monthLabel}</Text>
        </View>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptics.selectionAsync();
              onPreviousMonth();
            }}
            style={[styles.iconButton, { borderColor: colors.border }]}
          >
            <Feather name="chevron-left" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptics.selectionAsync();
              onToday();
            }}
            style={[
              styles.todayButton,
              {
                backgroundColor: colors.primaryMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.todayText, { color: colors.text }]}>Today</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptics.selectionAsync();
              onNextMonth();
            }}
            style={[styles.iconButton, { borderColor: colors.border }]}
          >
            <Feather name="chevron-right" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={[styles.weekday, { color: colors.textTertiary }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          return (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              onPress={() => {
                Haptics.selectionAsync();
                onSelectDate(day.date);
              }}
              style={[
                styles.dayCell,
                {
                  backgroundColor: isSelected ? colors.primaryMuted : "transparent",
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: day.inMonth ? colors.text : colors.textTertiary,
                  },
                  day.isToday && { color: colors.primary },
                ]}
              >
                {day.date.slice(8, 10)}
              </Text>
              <View style={styles.markerRow}>
                {day.kinds.slice(0, 3).map((kind) => (
                  <View
                    key={`${day.date}-${kind}`}
                    style={[
                      styles.marker,
                      { backgroundColor: markerColor(kind, colors) },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  eyebrow: {
    ...Typography.overline,
    letterSpacing: 2.4,
  },
  title: {
    ...Typography.heading,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  todayButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  todayText: {
    ...Typography.captionMedium,
  },
  weekdays: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekday: {
    ...Typography.small,
    width: "14%",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  dayCell: {
    width: "13.5%",
    minHeight: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: Spacing.xs,
  },
  dayNumber: {
    ...Typography.captionMedium,
  },
  markerRow: {
    flexDirection: "row",
    gap: 3,
    minHeight: 6,
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
