import type { HomeView } from "@/src/lib/home/types";
import type { HomeQuickAction } from "@/src/hooks/useHomeTimeline";

import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BorderRadius, Spacing } from "@/src/constants/spacing";
import { Typography } from "@/src/constants/typography";
import { useColors } from "@/src/hooks/useColors";

type Props = {
  hero: HomeView["hero"];
  milestones: HomeView["milestones"];
  presence: HomeView["presence"];
  quickActions: HomeQuickAction[];
  onPressAction: (action: HomeQuickAction) => void;
};

function heroEyebrow(kind?: HomeView["hero"] extends infer T
  ? T extends { kind: infer K }
    ? K
    : never
  : never) {
  switch (kind) {
    case "checkIn":
      return "Relationship Pulse";
    case "loveNote":
      return "Love Note";
    case "memory":
      return "Shared Memory";
    case "countdown":
      return "Countdown";
    default:
      return "Together";
  }
}

export function TimelineHero({
  hero,
  milestones,
  presence,
  quickActions,
  onPressAction,
}: Props) {
  const colors = useColors();
  const title =
    hero?.title ?? presence?.coupleName ?? "Shared day";
  const body =
    hero?.body ??
    (presence?.partner
      ? `${presence.self.displayName} and ${presence.partner.displayName} are connected.`
      : "Your shared space is ready for the next thing you do together.");

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          {heroEyebrow(hero?.kind)}
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>

        {presence ? (
          <View style={styles.presenceRow}>
            <View
              style={[
                styles.presencePill,
                {
                  backgroundColor: colors.primaryMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather
                name={presence.partner ? "heart" : "user-plus"}
                size={14}
                color={colors.primary}
              />
              <Text style={[styles.presenceText, { color: colors.text }]}>
                {presence.partner
                  ? `${presence.self.displayName} + ${presence.partner.displayName}`
                  : `${presence.self.displayName} is waiting for a partner`}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              onPress={() => onPressAction(action)}
              style={[
                styles.actionCard,
                {
                  backgroundColor: action.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name={action.icon} size={16} color={action.tint} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {milestones.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.milestoneRow}
        >
          {milestones.map((milestone) => (
            <View
              key={milestone.id}
              style={[
                styles.milestoneCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.milestoneType, { color: colors.primary }]}>
                {milestone.type === "countdown" ? "Countdown" : "Milestone"}
              </Text>
              <Text style={[styles.milestoneTitle, { color: colors.text }]}>
                {milestone.title}
              </Text>
              <Text style={[styles.milestoneMeta, { color: colors.textSecondary }]}>
                {milestone.daysUntil === 0
                  ? "Today"
                  : `${milestone.daysUntil} day${milestone.daysUntil === 1 ? "" : "s"}`}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.lg,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    gap: Spacing.lg,
  },
  eyebrow: {
    ...Typography.overline,
    letterSpacing: 2.4,
  },
  title: {
    ...Typography.title,
    fontStyle: "italic",
  },
  body: {
    ...Typography.body,
  },
  presenceRow: {
    flexDirection: "row",
  },
  presencePill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  presenceText: {
    ...Typography.captionMedium,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  actionCard: {
    minWidth: "47%",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionLabel: {
    ...Typography.captionMedium,
  },
  milestoneRow: {
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },
  milestoneCard: {
    width: 144,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  milestoneType: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  milestoneTitle: {
    ...Typography.subheading,
  },
  milestoneMeta: {
    ...Typography.caption,
  },
});
