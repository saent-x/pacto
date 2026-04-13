import type { HomeView, TimelineItem } from "@/src/lib/home/types";

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { format, isToday, isTomorrow } from "date-fns";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { Spacing } from "@/src/constants/spacing";
import { Typography } from "@/src/constants/typography";
import { useColors } from "@/src/hooks/useColors";
import { useTheme } from "@/src/lib/theme";

type Props = {
  timeline: HomeView["timeline"];
  isLoading: boolean;
  onPressItem: (item: TimelineItem) => void;
};

const COLLAPSED_LIMIT = 3;
const MAX_ITEMS = 6;

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
    case "ritual":
      return "refresh-cw";
    default:
      return "book-open";
  }
}

function tintForType(
  type: TimelineItem["type"],
  colors: ReturnType<typeof useColors>,
) {
  switch (type) {
    case "event":
      return colors.info;
    case "plan":
      return colors.plans;
    case "reminder":
      return colors.reminders;
    case "task":
      return colors.tasks;
    case "ritual":
      return colors.primary;
    default:
      return colors.journal;
  }
}

function compactTime(item: TimelineItem) {
  if (!item.occursAt) return null;
  if (item.type === "task" || item.type === "plan" || item.type === "ritual") return null;
  return format(item.occursAt, "h:mm a");
}

type BucketKey = "overdue" | "today" | "tomorrow" | "later";

type Bucket = {
  key: BucketKey;
  label: string;
  items: TimelineItem[];
};

function bucketItems(items: TimelineItem[]): Bucket[] {
  const feed = items.filter((i) => i.type !== "memory");
  const overdue: TimelineItem[] = [];
  const today: TimelineItem[] = [];
  const tomorrow: TimelineItem[] = [];
  const later: TimelineItem[] = [];

  for (const item of feed) {
    if (item.isOverdue) {
      overdue.push(item);
    } else if (!item.occursAt || isToday(item.occursAt)) {
      today.push(item);
    } else if (isTomorrow(item.occursAt)) {
      tomorrow.push(item);
    } else {
      later.push(item);
    }
  }

  const buckets: Bucket[] = [];
  if (overdue.length > 0) buckets.push({ key: "overdue", label: "Overdue", items: overdue });
  if (today.length > 0) buckets.push({ key: "today", label: "Today", items: today });
  if (tomorrow.length > 0) buckets.push({ key: "tomorrow", label: "Tomorrow", items: tomorrow });
  if (later.length > 0) buckets.push({ key: "later", label: "This week", items: later });
  return buckets;
}

function TimelineRow({
  item,
  onPress,
}: {
  item: TimelineItem;
  onPress: () => void;
}) {
  const C = useColors();
  const { mode } = useTheme();
  const tint = item.isOverdue ? C.error : tintForType(item.type, C);
  const tintBg = item.isOverdue ? C.errorLight : `${tint}18`;
  const time = compactTime(item);
  const rowBg = mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: rowBg, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconDot, { backgroundColor: tintBg }]}>
        <Feather name={iconForType(item.type)} size={13} color={tint} />
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, { color: C.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {(time || item.subtitle) && (
          <Text style={[styles.rowSub, { color: C.textTertiary }]} numberOfLines={1}>
            {[time, item.subtitle].filter(Boolean).join(" · ")}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={14} color={C.textTertiary} />
    </Pressable>
  );
}

export function TimelineFeed({ timeline, isLoading, onPressItem }: Props) {
  const C = useColors();
  const { mode } = useTheme();

  const glassBg = mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
  const buckets = useMemo(() => bucketItems(timeline), [timeline]);
  const [activeTab, setActiveTab] = useState<BucketKey | null>(null);
  const [expanded, setExpanded] = useState(false);

  const selectedKey = activeTab && buckets.some((b) => b.key === activeTab)
    ? activeTab
    : buckets[0]?.key ?? null;

  const activeBucket = buckets.find((b) => b.key === selectedKey) ?? null;
  const capped = activeBucket ? activeBucket.items.slice(0, MAX_ITEMS) : [];
  const hasOverflow = capped.length > COLLAPSED_LIMIT;
  const visible = expanded ? capped : capped.slice(0, COLLAPSED_LIMIT);
  const remaining = capped.length - COLLAPSED_LIMIT;

  return (
    <View style={styles.wrapper}>
      {isLoading ? (
        <View style={[styles.emptyCard, { backgroundColor: glassBg }]}>
          <Text style={[styles.emptyTitle, { color: C.text }]}>Loading your day</Text>
          <Text style={[styles.emptyBody, { color: C.textSecondary }]}>
            Pulling shared plans, reminders, and the next moment that matters.
          </Text>
        </View>
      ) : buckets.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: glassBg }]}>
          <View style={[styles.emptyIcon, { backgroundColor: C.primaryMuted }]}>
            <Feather name="sun" size={22} color={C.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>All clear</Text>
          <Text style={[styles.emptyBody, { color: C.textSecondary }]}>
            New reminders, plans, and rituals will land here as soon as they're due.
          </Text>
        </View>
      ) : (
        <View style={styles.tabContent}>
          <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>TODAY & NEXT</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabRow, { borderBottomColor: C.border }]} contentContainerStyle={styles.tabRowContent}>
            {buckets.map((bucket) => {
              const active = bucket.key === selectedKey;
              const isOverdue = bucket.key === "overdue";
              const tint = isOverdue ? C.error : C.primary;
              return (
                <Pressable
                  key={bucket.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(bucket.key);
                    setExpanded(false);
                  }}
                  style={styles.tabButton}
                >
                  <View style={styles.tabLabelRow}>
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: active ? tint : C.textTertiary },
                      ]}
                    >
                      {bucket.label}
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: active ? (isOverdue ? C.errorLight : `${C.primary}18`) : (mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)") }]}>
                      <Text style={[styles.countText, { color: active ? tint : C.textTertiary }]}>
                        {bucket.items.length}
                      </Text>
                    </View>
                  </View>
                  {active ? (
                    <Animated.View
                      layout={LinearTransition.springify()
                        .damping(18)
                        .stiffness(220)}
                      style={[styles.tabLine, { backgroundColor: tint }]}
                    />
                  ) : (
                    <View style={styles.tabLineSpacer} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.bucketList}>
            {visible.map((item) => (
              <TimelineRow
                key={item.id}
                item={item}
                onPress={() => onPressItem(item)}
              />
            ))}
            {hasOverflow && (
              <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                style={styles.showMore}
                activeOpacity={0.7}
              >
                <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={C.primary} />
                <Text style={[styles.showMoreText, { color: C.primary }]}>
                  {expanded ? "Show less" : `${remaining} more`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.md,
  },
  tabContent: {
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  tabRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.sm,
  },
  tabRowContent: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  tabButton: {
    position: "relative",
    paddingBottom: Spacing.sm,
  },
  tabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabLabel: {
    ...Typography.captionMedium,
  },
  tabLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  tabLineSpacer: {
    height: 2,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countText: {
    ...Typography.small,
    fontSize: 11,
    fontFamily: Typography.sansSemiBold,
  },
  bucketList: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    borderRadius: 10,
  },
  iconDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.body,
    marginBottom: 1,
  },
  rowSub: {
    ...Typography.small,
  },
  showMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 10,
  },
  showMoreText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 12,
    padding: Spacing.xl,
    gap: Spacing.sm,
    alignItems: "center",
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.subheading,
  },
  emptyBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
