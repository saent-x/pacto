import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { format, parseISO } from "date-fns";
import { useCallback, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { db, id } from "@/src/lib/instant";
import { useSession } from "@/src/hooks/useSession";

import { MiniDateRail } from "@/src/components/calendar/MiniDateRail";
import { CreateEventSheet } from "@/src/components/calendar/CreateEventSheet";
import { toPlainMarkdownPreview } from "@/src/components/journal/MarkdownText";
import { BorderRadius, Spacing } from "@/src/constants/spacing";
import { Typography } from "@/src/constants/typography";
import { useCalendar } from "@/src/hooks/useCalendar";
import { useColors } from "@/src/hooks/useColors";

function formatAgendaTime(occursAt: number | null) {
  if (!occursAt) {
    return "All day";
  }
  return format(occursAt, "h:mm a");
}

export default function CalendarScreen() {
  const C = useColors();
  const calendar = useCalendar();
  const { activeCouple, user } = useSession();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedDateLabel = calendar.selectedDate
    ? format(parseISO(calendar.selectedDate), "EEEE, d MMMM")
    : `All dates in ${calendar.monthLabel}`;

  const handleSaveEvent = useCallback(
    async (data: {
      title: string;
      description: string | null;
      startsAt: number;
      endsAt: number | null;
      category: string | null;
      location: string | null;
      priority: number;
      isPrivate: boolean;
    }) => {
      const coupleId = activeCouple?.couple?.id ?? null;
      if (!coupleId || !user) return;
      const eventId = id();
      const now = Date.now();
      await db.transact(
        db.tx.events[eventId]
          .update({
            title: data.title,
            description: data.description ?? undefined,
            startsAt: data.startsAt,
            endsAt: data.endsAt ?? undefined,
            category: data.category ?? undefined,
            location: data.location ?? undefined,
            priority: data.priority,
            isPrivate: data.isPrivate,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: coupleId, createdBy: user.id }),
      );
      await calendar.refetch();
    },
    [activeCouple, user, calendar],
  );
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await calendar.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [calendar]);

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.screenBackground }]} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
        >
          <MiniDateRail
            title="Shared rhythm"
            selectedDate={calendar.selectedDate}
            helperLabel="Calendar"
            accentColor={C.primary}
            onSelectDate={(date) => {
              Haptics.selectionAsync();
              calendar.selectDate(date);
            }}
          />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionEyebrow, { color: C.primary }]}>Selected day</Text>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{selectedDateLabel}</Text>
            </View>
            {calendar.agenda.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: C.card, borderColor: C.border },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: C.text }]}>
                  Nothing scheduled
                </Text>
                <Text style={[styles.emptyBody, { color: C.textSecondary }]}>
                  This day is clear. Shared items will appear here as soon as they land on the
                  timeline.
                </Text>
              </View>
            ) : (
              calendar.agenda.map((item) => {
                const itemLocation =
                  typeof (item as { location?: unknown }).location === "string"
                    ? (item as { location?: string }).location ?? null
                    : null;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.agendaCard,
                      { backgroundColor: C.card, borderColor: C.border },
                    ]}
                  >
                    <Text style={[styles.agendaMeta, { color: C.primary }]}>
                      {item.type.toUpperCase()}
                    </Text>
                    <Text style={[styles.agendaTitle, { color: C.text }]}>{item.title}</Text>
                    <Text style={[styles.agendaTime, { color: C.textSecondary }]}>
                      {formatAgendaTime(item.occursAt)}
                    </Text>
                    {item.subtitle ? (
                      <Text style={[styles.agendaBody, { color: C.textSecondary }]} numberOfLines={2}>
                        {toPlainMarkdownPreview(item.subtitle)}
                      </Text>
                    ) : null}
                    {itemLocation ? (
                      <Text style={[styles.agendaBody, { color: C.textSecondary }]}>
                        {itemLocation}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>

          {calendar.milestones.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Countdowns</Text>
              <View style={styles.countdownRow}>
                {calendar.milestones.map((milestone) => (
                  <View
                    key={milestone.id}
                    style={[
                      styles.countdownCard,
                      { backgroundColor: C.card, borderColor: C.border },
                    ]}
                  >
                    <Text style={[styles.agendaMeta, { color: C.primary }]}>
                      {milestone.type === "countdown" ? "ANNIVERSARY" : "MILESTONE"}
                    </Text>
                    <Text style={[styles.agendaTitle, { color: C.text }]}>
                      {milestone.title}
                    </Text>
                    <Text style={[styles.agendaBody, { color: C.textSecondary }]}>
                      {milestone.daysUntil === 0
                        ? "Today"
                        : `${milestone.daysUntil} day${milestone.daysUntil === 1 ? "" : "s"} away`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: C.primary }]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          sheetRef.current?.present();
        }}
      >
        <Feather name="plus" size={22} color={C.ink} />
      </TouchableOpacity>

      <CreateEventSheet sheetRef={sheetRef} onSave={handleSaveEvent} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    gap: Spacing.xl,
  },
  section: {
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.lg,
  },
  sectionHeader: {
    gap: Spacing.xs,
  },
  sectionEyebrow: {
    ...Typography.overline,
    letterSpacing: 2.2,
  },
  sectionTitle: {
    ...Typography.heading,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.subheading,
  },
  emptyBody: {
    ...Typography.body,
  },
  agendaCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  agendaMeta: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  agendaTitle: {
    ...Typography.subheading,
  },
  agendaTime: {
    ...Typography.captionMedium,
  },
  agendaBody: {
    ...Typography.body,
  },
  countdownRow: {
    gap: Spacing.md,
  },
  countdownCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing["2xl"],
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
