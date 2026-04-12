import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  addWeeks,
} from "date-fns";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { LinearTransition } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { BorderRadius, Spacing } from "@/src/constants/spacing";
import { Typography } from "@/src/constants/typography";
import { useColors } from "@/src/hooks/useColors";
import { useTheme } from "@/src/lib/theme";

type Props = {
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  accentColor: string;
  title?: string;
  onPressLeading?: () => void;
  leadingIcon?: React.ComponentProps<typeof Feather>["name"];
  helperLabel?: string;
  onPressAction?: () => void;
  actionIcon?: React.ComponentProps<typeof Feather>["name"];
  showClearAction?: boolean;
  tabs?: Array<{
    value: string;
    label: string;
  }>;
  selectedTab?: string;
  onSelectTab?: (value: string) => void;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function MiniDateRail({
  selectedDate,
  onSelectDate,
  accentColor,
  title,
  onPressLeading,
  leadingIcon = "arrow-left",
  helperLabel = "Filter by date",
  onPressAction,
  actionIcon = "edit-3",
  showClearAction = true,
  tabs,
  selectedTab,
  onSelectTab,
}: Props) {
  const C = useColors();
  const { mode } = useTheme();
  const shellBg = mode === "dark" ? C.background : C.surface;
  const pillBg = mode === "dark" ? C.card : C.background;
  const dayPillBg = mode === "dark" ? C.card : C.background;
  const referenceDate = selectedDate ? parseISO(selectedDate) : new Date();
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(referenceDate, { weekStartsOn: 1 }),
  });

  const shiftWeek = (direction: -1 | 1) => {
    Haptics.selectionAsync();
    const nextDate = addWeeks(referenceDate, direction);
    onSelectDate(format(nextDate, "yyyy-MM-dd"));
  };

  return (
    <View
      style={[
        styles.shell,
        { backgroundColor: shellBg, borderColor: C.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          {onPressLeading ? (
            <Pressable
              onPress={onPressLeading}
              hitSlop={8}
              style={styles.leadingButton}
            >
              <Feather name={leadingIcon} size={20} color={C.text} />
            </Pressable>
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={[styles.helperLabel, { color: C.textTertiary }]}>
              {title}
            </Text>
          </View>
        </View>
        {/*{onPressAction ? (
          <Pressable
            onPress={onPressAction}
            style={[styles.composeBtn, { backgroundColor: C.card, borderColor: C.border }]}
          >
            <Feather name={actionIcon} size={16} color={accentColor} />
          </Pressable>
        ) : null}*/}
      </View>

      <View style={styles.monthRow}>
        {showClearAction ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onSelectDate(null);
            }}
            style={[
              styles.clearPill,
              {
                backgroundColor: selectedDate ? pillBg : accentColor,
                borderColor: selectedDate ? C.border : accentColor,
              },
            ]}
          >
            <Text
              style={[
                styles.clearLabel,
                { color: selectedDate ? C.textSecondary : C.ink },
              ]}
            >
              All dates
            </Text>
          </Pressable>
        ) : (
          <View style={styles.clearSpacer} />
        )}

        <View style={styles.monthCenter}>
          <View style={styles.monthLabelRow}>
            <Text style={[styles.monthCaption, { color: accentColor }]}>
              Week
            </Text>
            <Text
              style={[styles.monthLabel, { color: C.text }]}
              numberOfLines={1}
            >
              {format(referenceDate, "MMMM yyyy")}
            </Text>
          </View>
        </View>

        <View style={styles.headerControls}>
          <Pressable
            onPress={() => shiftWeek(-1)}
            style={[styles.arrowBtn, { borderColor: C.border }]}
          >
            <Feather name="chevron-left" size={16} color={C.textTertiary} />
          </Pressable>
          <Pressable
            onPress={() => shiftWeek(1)}
            style={[styles.arrowBtn, { borderColor: C.border }]}
          >
            <Feather name="chevron-right" size={16} color={C.textTertiary} />
          </Pressable>
        </View>
      </View>

      {tabs && selectedTab && onSelectTab ? (
        <View style={[styles.tabRow, { borderBottomColor: C.border }]}>
          {tabs.map((tab) => {
            const active = tab.value === selectedTab;
            return (
              <Pressable
                key={tab.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelectTab(tab.value);
                }}
                style={styles.tabButton}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? accentColor : C.textTertiary },
                  ]}
                >
                  {tab.label}
                </Text>
                {active ? (
                  <Animated.View
                    layout={LinearTransition.springify()
                      .damping(18)
                      .stiffness(220)}
                    style={[styles.tabLine, { backgroundColor: accentColor }]}
                  />
                ) : (
                  <View style={styles.tabLineSpacer} />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.dayRow}>
        {weekDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const isSelected = selectedDate
            ? isSameDay(day, parseISO(selectedDate))
            : false;
          const isTodayDate = isSameDay(day, new Date());

          return (
            <Pressable
              key={dateKey}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectDate(isSelected ? null : dateKey);
              }}
              style={[
                styles.dayPill,
                {
                  backgroundColor: isSelected ? accentColor : dayPillBg,
                  borderColor: isSelected ? accentColor : C.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.weekday,
                  { color: isSelected ? C.ink : C.textTertiary },
                ]}
              >
                {format(day, "EEE")}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  { color: isSelected ? C.ink : C.text },
                ]}
              >
                {format(day, "d")}
              </Text>
              <View
                style={[
                  styles.todayDot,
                  {
                    backgroundColor: isTodayDate
                      ? isSelected
                        ? C.ink
                        : accentColor
                      : "transparent",
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  leadingButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  helperLabel: {
    ...Typography.bodyMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  screenTitle: {
    ...Typography.title,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  monthCenter: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  monthLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: Spacing.xs,
    minWidth: 0,
  },
  monthCaption: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  composeBtn: {
    width: 34,
    height: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  clearPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  clearSpacer: {
    width: 76,
  },
  clearLabel: {
    ...Typography.small,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    ...Typography.headingRegular,
  },
  dayRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.sm,
  },
  tabButton: {
    position: "relative",
    paddingBottom: Spacing.sm,
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
  dayPill: {
    flex: 1,
    minHeight: 60,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  weekday: {
    ...Typography.small,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dayNumber: {
    ...Typography.subheading,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
});
