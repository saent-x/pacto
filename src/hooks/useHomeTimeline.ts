import { useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { db } from '@/src/lib/instant';
import type { PresenceInfo } from '@/src/lib/home/types';
import {
  buildTimelineItems,
  buildMemoryPreviews,
  buildMilestones,
  selectFeaturedSignal,
} from '@/src/lib/home/builders';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';
import { buildTodayRingSummary, type TodayRingSummary } from '@/src/lib/home/todayRings';
import { useSession } from '@/src/hooks/useSession';

export type TodaySummary = TodayRingSummary;

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

function getLocalDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function useHomeTimeline(options?: { previewDays?: number }) {
  const { activeCouple, profile, isFeatureEnabled } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const previewDays = options?.previewDays ?? 7;
  const todayKey = getLocalDateKey();
  const warmedDateRef = useRef<string | null>(null);
  const calendarEnabled = isFeatureEnabled('calendar');
  const goalsEnabled = isFeatureEnabled('goals');
  const recurringEnabled = isFeatureEnabled('recurring');
  const checkinsEnabled = isFeatureEnabled('checkins');
  const tasksEnabled = isFeatureEnabled('tasks');
  const memoriesEnabled = isFeatureEnabled('memories');
  const journalEnabled = isFeatureEnabled('journal');

  const query = useMemo(() => {
    if (!coupleId) return null;
    const spaceWhere = { $: { where: { 'couple.id': coupleId } } };
    return {
      ...(calendarEnabled ? { events: spaceWhere } : {}),
      ...(goalsEnabled ? { plans: spaceWhere } : {}),
      ...(recurringEnabled ? { rituals: spaceWhere, reminders: spaceWhere } : {}),
      ...(checkinsEnabled ? { checkIns: spaceWhere } : {}),
      ...(tasksEnabled ? { tasks: spaceWhere } : {}),
      ...(memoriesEnabled ? { milestones: spaceWhere, loveNotes: spaceWhere } : {}),
      ...(journalEnabled ? { journalEntries: spaceWhere } : {}),
      dailyVerseCache: { $: { where: { dateKey: todayKey } } },
    };
  }, [
    coupleId,
    calendarEnabled,
    goalsEnabled,
    recurringEnabled,
    checkinsEnabled,
    tasksEnabled,
    memoriesEnabled,
    journalEnabled,
    todayKey,
  ]);

  const { data, isLoading: queryLoading, error: queryError } = (
    db as any
  ).useQuery(query);

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
    const events = calendarEnabled ? data?.events ?? [] : [];
    const plans = goalsEnabled ? data?.plans ?? [] : [];
    const reminders = recurringEnabled ? data?.reminders ?? [] : [];
    const rituals = recurringEnabled ? data?.rituals ?? [] : [];
    const tasks = tasksEnabled ? data?.tasks ?? [] : [];
    const journalEntries = journalEnabled ? data?.journalEntries ?? [] : [];
    const loveNotes = memoriesEnabled ? data?.loveNotes ?? [] : [];
    const checkIns = checkinsEnabled ? data?.checkIns ?? [] : [];
    const milestones = memoriesEnabled ? data?.milestones ?? [] : [];

    const memories = buildMemoryPreviews({
      journalEntries,
      loveNotes,
    });
    const memoryPreview = memories[0] ?? null;

    const milestoneStrip = buildMilestones({
      now,
      couple: {
        id: coupleId ?? '',
        anniversary: memoriesEnabled ? activeCouple?.couple?.anniversary ?? null : null,
      },
      milestones,
    });

    const timeline = buildTimelineItems({
      now,
      previewDays,
      events,
      plans,
      reminders,
      tasks,
      rituals,
      memories: memoryPreview ? [memoryPreview] : [],
    });

    const hero = selectFeaturedSignal({
      now,
      presence,
      milestones: milestoneStrip,
      memoryPreview,
      checkIns,
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

    const todaySummary = buildTodayRingSummary({
      now,
      plans,
      events,
      tasks,
      reminders,
    });

    return {
      hero,
      timeline,
      milestones: milestoneStrip,
      memories,
      memoryPreview,
      dailyVerse,
      todaySummary,
    };
  }, [
    data,
    previewDays,
    coupleId,
    activeCouple?.couple?.anniversary,
    presence,
    todayKey,
    calendarEnabled,
    goalsEnabled,
    recurringEnabled,
    checkinsEnabled,
    tasksEnabled,
    memoriesEnabled,
    journalEnabled,
  ]);

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
