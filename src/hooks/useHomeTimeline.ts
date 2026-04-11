import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { db } from '@/src/lib/instant';
import type { HomeView } from '@/src/lib/home/types';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export type HomeQuickAction = {
  id: string;
  label: string;
  route: string;
  icon: ComponentProps<typeof Feather>['name'];
  tint: string;
  background: string;
};

async function fetchHomeView(token: string | null, previewDays: number): Promise<HomeView | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/home?previewDays=${previewDays}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useHomeTimeline(options?: { previewDays?: number }) {
  const colors = useColors();
  const { activeCouple } = useSession();
  const [view, setView] = useState<HomeView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const warmedDateRef = useRef<string | null>(null);
  const previewDays = options?.previewDays ?? 7;
  const todayKey = new Date().toISOString().slice(0, 10);

  const loadView = useCallback(async () => {
    const user = await db.getAuth();
    const token = user?.refresh_token ?? null;
    setIsLoading(true);
    const result = await fetchHomeView(token, previewDays);
    setView(result);
    setIsLoading(false);
  }, [previewDays]);

  useEffect(() => {
    if (!activeCouple) {
      setView(null);
      setIsLoading(false);
      return;
    }
    loadView();
  }, [activeCouple, loadView]);

  // Ensure daily verse once per day
  useEffect(() => {
    if (warmedDateRef.current === todayKey || !activeCouple) return;
    warmedDateRef.current = todayKey;
    db.getAuth().then((user) => {
      const token = user?.refresh_token ?? null;
      if (!token) return;
      fetch(`${API_BASE}/api/daily-verse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(() => loadView())
        .catch(() => undefined);
    });
  }, [todayKey, activeCouple, loadView]);

  const quickActions = useMemo<HomeQuickAction[]>(
    () => [
      {
        id: 'calendar',
        label: 'Calendar',
        route: '/(tabs)/calendar',
        icon: 'calendar',
        tint: colors.info,
        background: colors.infoLight,
      },
      {
        id: 'reminders',
        label: 'Reminders',
        route: '/(tabs)/reminders',
        icon: 'bell',
        tint: colors.reminders,
        background: colors.remindersLight,
      },
      {
        id: 'tasks',
        label: 'Tasks',
        route: '/(tabs)/tasks',
        icon: 'check-square',
        tint: colors.tasks,
        background: colors.tasksLight,
      },
      {
        id: 'journal',
        label: 'Journal',
        route: '/(tabs)/journal',
        icon: 'book-open',
        tint: colors.journal,
        background: colors.journalLight,
      },
    ],
    [colors],
  );

  return {
    isLoading,
    hero: view?.hero ?? null,
    timeline: view?.timeline ?? [],
    milestones: view?.milestones ?? [],
    memories: view?.memories ?? [],
    memoryPreview: view?.memoryPreview ?? null,
    presence: view?.presence ?? null,
    dailyVerse: view?.dailyVerse ?? getCuratedDailyVerse(todayKey),
    quickActions,
    refetch: loadView,
  };
}
