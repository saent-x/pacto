import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { format, parseISO } from "date-fns";
import { useCallback, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery, useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";

import { MiniDateRail } from "@/src/components/calendar/MiniDateRail";
import { CreateEventSheet } from "@/src/components/calendar/CreateEventSheet";
import { toPlainMarkdownPreview } from "@/src/components/journal/MarkdownText";
import { BorderRadius, Spacing } from "@/src/constants/spacing";
import { Typography } from "@/src/constants/typography";
import { useCalendar } from "@/src/hooks/useCalendar";
import { useColors } from "@/src/hooks/useColors";

const listEventsQuery = makeFunctionReference<"query", { from?: number; to?: number }>("events:listEvents");
const createEventMutation = makeFunctionReference<"mutation", {}>("events:createEvent");

function formatAgendaTime(occursAt: number | null) {
  if (!occursAt) {
    return "All day";
  }
  return format(occursAt, "h:mm a");
}

export default function CalendarScreen() {
  const C = useColors();
  const calendar = useCalendar();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);

  const events = useQuery(listEventsQuery, {}) as
    | Array<{
        _id: string;
        title: string;
        description: string | null;
        startsAt: number;
        endsAt: number | null;
        category: string | null;
        location: string | null;
        priority: number;
        isPrivate: boolean;
      }>
    | undefined;
  const createEvent = useMutation(createEventMutation) as any;

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
      await createEvent(data);
      await calendar.refetch();
    },
    [createEvent, calendar],
  );
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await calendar.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [calendar]);

  const convexEventAgenda =
    events?.map((ev) => ({
      id: ev._id,
      type: "event" as const,
      title: ev.title,
      subtitle: ev.description,
      occursAt: ev.startsAt,
      category: ev.category,
      location: ev.location,
      priority: ev.priority,
      isPrivate: ev.isPrivate,
    })) ?? [];
  const mergedAgenda =
    convexEventAgenda.length > 0 ? convexEventAgenda : calendar.agenda;

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.surface }]} edges={["top"]}>
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
            {mergedAgenda.length === 0 ? (
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
              mergedAgenda.map((item) => (
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
                  {"location" in item && item.location ? (
                    <Text style={[styles.agendaBody, { color: C.textSecondary }]}>
                      {item.location}
                    </Text>
                  ) : null}
                </View>
              ))
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
                      { backgroundColor: C.surface, borderColor: C.border },
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
        <Feather name="plus" size={24} color={C.ink} />
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
