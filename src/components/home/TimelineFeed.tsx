import type { HomeView, TimelineItem } from "@/convex/timeline";

import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { StyleSheet, Text, View } from "react-native";

import { BorderRadius, Spacing } from "@/src/constants/spacing";
import { Typography } from "@/src/constants/typography";
import { useColors } from "@/src/hooks/useColors";
import { useTheme } from "@/src/lib/theme";

type Props = {
  timeline: HomeView["timeline"];
  isLoading: boolean;
};

function iconForType(type: TimelineItem["type"]): keyof typeof Feather.glyphMap {
  switch (type) {
    case "event":
      return "calendar";
    case "plan":
      return "compass";
    case "reminder":
      return "bell";
    case "task":
      return "check-square";
    default:
      return "book-open";
  }
}

function timeLabel(item: TimelineItem) {
  if (!item.occursAt) {
    return "Anytime";
  }
  if (item.type === "task" || item.type === "plan") {
    return format(item.occursAt, "EEE d MMM");
  }
  return format(item.occursAt, "EEE d MMM, h:mm a");
}

export function TimelineFeed({ timeline, isLoading }: Props) {
  const colors = useColors();
  const { mode } = useTheme();
  const feedItems = timeline.filter((item) => item.type !== "memory");

  const glassBg = mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const glassBorder = mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Timeline</Text>
        <Text style={[styles.heading, { color: colors.text }]}>Today and next</Text>
      </View>

      {isLoading ? (
        <View style={[styles.emptyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Loading your day</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Pulling shared plans, reminders, and the next moment that matters.
          </Text>
        </View>
      ) : feedItems.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing urgent today</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            New reminders, plans, and rituals will land here as soon as they are due.
          </Text>
        </View>
      ) : (
        feedItems.map((item) => (
          <View
            key={item.id}
            style={[
              item.type === "task" ? styles.taskRow : styles.row,
              {
                backgroundColor:
                  item.type === "task" ? colors.card : colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            {item.type === "task" ? (
              <View
                style={[
                  styles.taskRail,
                  { backgroundColor: item.priority > 0 ? colors.tasks : colors.dim },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: item.isOverdue ? colors.errorLight : colors.primaryMuted,
                  },
                ]}
              >
                <Feather
                  name={iconForType(item.type)}
                  size={15}
                  color={item.isOverdue ? colors.error : colors.primary}
                />
              </View>
            )}
            <View style={styles.rowContent}>
              <View style={styles.rowMetaLine}>
                <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
                  {item.isOverdue ? "Overdue" : timeLabel(item)}
                </Text>
                {item.type === "task" ? (
                  <Text style={[styles.typePill, { color: colors.tasks }]}>Task</Text>
                ) : null}
              </View>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
  },
  eyebrow: {
    ...Typography.overline,
    letterSpacing: 2.4,
  },
  heading: {
    ...Typography.heading,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
    borderRadius: BorderRadius.lg,
    minHeight: 74,
    gap: Spacing.md,
  },
  taskRail: {
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    gap: 2,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.sm,
  },
  rowMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  rowMeta: {
    ...Typography.small,
  },
  typePill: {
    ...Typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  rowTitle: {
    ...Typography.subheading,
  },
  rowSubtitle: {
    ...Typography.caption,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.subheading,
  },
  emptyBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
