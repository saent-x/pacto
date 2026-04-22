import { useEffect, useMemo, useRef } from 'react';
import { db } from '@/src/lib/instant';
import type { PresenceInfo } from '@/src/lib/home/types';
import {
  buildTimelineItems,
  buildMemoryPreviews,
  buildMilestones,
  selectFeaturedSignal,
} from '@/src/lib/home/builders';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';
import { useSession } from '@/src/hooks/useSession';

export type TodaySummary = {
  plans: { done: number; total: number };
  focus: { done: number; total: number };
};

function toDateString(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export function useHomeTimeline(options?: { previewDays?: number }) {
  const { activeCouple, profile } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const previewDays = options?.previewDays ?? 7;
  const todayKey = new Date().toISOString().slice(0, 10);
  const warmedDateRef = useRef<string | null>(null);

  const { data, isLoading: queryLoading, error: queryError } = (
    db as any
  ).useQuery(
    coupleId
      ? {
          events: { $: { where: { 'couple.id': coupleId } } },
          plans: { $: { where: { 'couple.id': coupleId } } },
          rituals: { $: { where: { 'couple.id': coupleId } } },
          checkIns: { $: { where: { 'couple.id': coupleId } } },
          reminders: { $: { where: { 'couple.id': coupleId } } },
          tasks: { $: { where: { 'couple.id': coupleId } } },
          milestones: { $: { where: { 'couple.id': coupleId } } },
          journalEntries: { $: { where: { 'couple.id': coupleId } } },
          loveNotes: { $: { where: { 'couple.id': coupleId } } },
          dailyVerseCache: { $: { where: { dateKey: todayKey } } },
        }
      : null,
  );

  useEffect(() => {
    if (warmedDateRef.current === todayKey || !activeCouple) return;
    warmedDateRef.current = todayKey;
    (db as any).getAuth().then((auth: any) => {
      const token = auth?.refresh_token ?? null;
      if (!token) return;
      fetch(`${API_BASE}/api/daily-verse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    });
  }, [todayKey, activeCouple]);

  const presence = useMemo<PresenceInfo | null>(() => {
    if (!activeCouple || !profile) return null;
    return {
      coupleId: activeCouple.couple.id,
      coupleName: activeCouple.couple.name ?? '',
      memberCount: activeCouple.memberCount,
      relationshipState: activeCouple.partner ? 'paired' : 'waiting',
      self: {
        userId: profile.id,
        displayName: profile.displayName ?? '',
        avatarUrl: profile.avatarUrl,
      },
      partner: activeCouple.partner
        ? {
            userId: activeCouple.partner.id,
            displayName: activeCouple.partner.displayName,
            avatarUrl: activeCouple.partner.avatarUrl,
          }
        : null,
      joinedAt: 0,
    };
  }, [activeCouple, profile]);

  const homeView = useMemo(() => {
    const now = Date.now();

    const memories = buildMemoryPreviews({
      journalEntries: data?.journalEntries ?? [],
      loveNotes: data?.loveNotes ?? [],
    });
    const memoryPreview = memories[0] ?? null;

    const milestoneStrip = buildMilestones({
      now,
      couple: {
        id: coupleId ?? '',
        anniversary: activeCouple?.couple?.anniversary ?? null,
      },
      milestones: data?.milestones ?? [],
    });

    const timeline = buildTimelineItems({
      now,
      previewDays,
      events: data?.events ?? [],
      plans: data?.plans ?? [],
      reminders: data?.reminders ?? [],
      tasks: data?.tasks ?? [],
      rituals: data?.rituals ?? [],
      memories: memoryPreview ? [memoryPreview] : [],
    });

    const hero = selectFeaturedSignal({
      now,
      presence,
      milestones: milestoneStrip,
      memoryPreview,
      checkIns: data?.checkIns ?? [],
    });

    const verseRecord = (data?.dailyVerseCache ?? [])[0];
    const dailyVerse = verseRecord
      ? {
          text: verseRecord.text,
          reference: verseRecord.reference,
          translation: verseRecord.translation,
          source: verseRecord.source as 'remote' | 'fallback',
          dateKey: todayKey,
        }
      : getCuratedDailyVerse(todayKey);

    const today = toDateString(now);
    let plansDone = 0;
    let plansTotal = 0;
    for (const plan of data?.plans ?? []) {
      if (plan.isPrivate) continue;
      if ((plan.targetDate ?? null) !== today) continue;
      plansTotal += 1;
      const status = (plan.status ?? '').toLowerCase();
      if (status === 'done' || status === 'completed') plansDone += 1;
    }
    for (const event of data?.events ?? []) {
      if (event.isPrivate) continue;
      if (!event.startsAt || toDateString(event.startsAt) !== today) continue;
      plansTotal += 1;
      if (event.startsAt < now) plansDone += 1;
    }

    let focusDone = 0;
    let focusTotal = 0;
    for (const task of data?.tasks ?? []) {
      if ((task.dueDate ?? null) !== today) continue;
      focusTotal += 1;
      if (task.isCompleted) focusDone += 1;
    }
    for (const reminder of data?.reminders ?? []) {
      if (reminder.dueAt == null) continue;
      if (toDateString(reminder.dueAt) !== today) continue;
      focusTotal += 1;
      if (reminder.isCompleted) focusDone += 1;
    }

    const todaySummary: TodaySummary = {
      plans: { done: plansDone, total: plansTotal },
      focus: { done: focusDone, total: focusTotal },
    };

    return {
      hero,
      timeline,
      milestones: milestoneStrip,
      memories,
      memoryPreview,
      dailyVerse,
      todaySummary,
    };
  }, [data, previewDays, coupleId, activeCouple?.couple?.anniversary, presence, todayKey]);

  return {
    isLoading: queryLoading,
    error: queryError ?? null,
    hero: homeView.hero,
    timeline: homeView.timeline,
    milestones: homeView.milestones,
    memories: homeView.memories,
    memoryPreview: homeView.memoryPreview,
    presence,
    dailyVerse: homeView.dailyVerse,
    todaySummary: homeView.todaySummary,
    refetch: async () => {},
  };
}
