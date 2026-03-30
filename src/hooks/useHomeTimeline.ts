import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import { useAction, useConvex, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";

import type { HomeView } from "@/convex/timeline";
import { useColors } from "@/src/hooks/useColors";

const getHomeViewQuery = makeFunctionReference<
  "query",
  { previewDays?: number; now?: number },
  HomeView
>("timeline:getHomeView");
const ensureDailyVerseAction = makeFunctionReference<
  "action",
  { now?: number },
  HomeView["dailyVerse"]
>("dailyVerse:ensureDailyVerse");

export type HomeQuickAction = {
  id: string;
  label: string;
  route: string;
  icon: ComponentProps<typeof Feather>["name"];
  tint: string;
  background: string;
};

export function useHomeTimeline(options?: { previewDays?: number }) {
  const colors = useColors();
  const convex = useConvex();
  const ensureDailyVerse = useAction(ensureDailyVerseAction);
  const warmedDateRef = useRef<string | null>(null);
  const view = useQuery(
    getHomeViewQuery,
    options?.previewDays ? { previewDays: options.previewDays } : {},
  );
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (warmedDateRef.current === todayKey) {
      return;
    }
    warmedDateRef.current = todayKey;
    void ensureDailyVerse({})
      .then(() =>
        convex.query(
          getHomeViewQuery,
          options?.previewDays ? { previewDays: options.previewDays } : {},
        ),
      )
      .catch(() => undefined);
  }, [convex, ensureDailyVerse, options?.previewDays, todayKey]);

  const quickActions = useMemo<HomeQuickAction[]>(
    () => [
      {
        id: "calendar",
        label: "Calendar",
        route: "/(tabs)/calendar",
        icon: "calendar",
        tint: colors.info,
        background: colors.infoLight,
      },
      {
        id: "reminders",
        label: "Reminders",
        route: "/(tabs)/reminders",
        icon: "bell",
        tint: colors.reminders,
        background: colors.remindersLight,
      },
      {
        id: "tasks",
        label: "Tasks",
        route: "/(tabs)/tasks",
        icon: "check-square",
        tint: colors.tasks,
        background: colors.tasksLight,
      },
      {
        id: "journal",
        label: "Journal",
        route: "/(tabs)/journal",
        icon: "book-open",
        tint: colors.journal,
        background: colors.journalLight,
      },
    ],
    [colors],
  );

  return {
    isLoading: view === undefined,
    hero: view?.hero ?? null,
    timeline: view?.timeline ?? [],
    milestones: view?.milestones ?? [],
    memories: view?.memories ?? [],
    memoryPreview: view?.memoryPreview ?? null,
    presence: view?.presence ?? null,
    dailyVerse: view?.dailyVerse ?? null,
    quickActions,
    refetch: async () => {
      await ensureDailyVerse({});
      await convex.query(
        getHomeViewQuery,
        options?.previewDays ? { previewDays: options.previewDays } : {},
      );
    },
  };
}
