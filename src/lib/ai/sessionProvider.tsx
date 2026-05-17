import React, { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/lib/session';
import type { FeatureId } from '@/src/lib/features/registry';
import { AiAssistantProvider } from './provider';
import { buildAiContextPrompt } from './context';
import type { AiContextRecord } from './context';
import { AI_DOMAINS, type AiDomain } from './types';

const AI_DOMAIN_FEATURES: Record<AiDomain, FeatureId> = {
  reminders: 'recurring',
  tasks: 'tasks',
  taskLists: 'tasks',
  events: 'calendar',
  loveNotes: 'memories',
  checkIns: 'checkins',
  wishlists: 'wishlist',
  wishlistItems: 'wishlist',
  milestones: 'memories',
  plans: 'goals',
  journalEntries: 'journal',
  timetables: 'timetable',
  timetableItems: 'timetable',
};

const AI_DOMAIN_RELATION: Record<AiDomain, 'couple' | 'space'> = {
  reminders: 'couple',
  tasks: 'couple',
  taskLists: 'couple',
  events: 'couple',
  loveNotes: 'couple',
  checkIns: 'couple',
  wishlists: 'couple',
  wishlistItems: 'couple',
  milestones: 'couple',
  plans: 'couple',
  journalEntries: 'couple',
  timetables: 'couple',
  timetableItems: 'couple',
};

export function buildAiSessionQuery(
  spaceId: string | null,
  isFeatureEnabled: (featureId: FeatureId) => boolean,
) {
  if (!spaceId) return null;
  const query = AI_DOMAINS.reduce<Record<string, unknown>>((acc, domain) => {
    if (!isFeatureEnabled(AI_DOMAIN_FEATURES[domain])) return acc;
    const relation = AI_DOMAIN_RELATION[domain];
    acc[domain] = {
      $: { where: { [`${relation}.id`]: spaceId } },
      [relation]: {},
    };
    return acc;
  }, {});
  return Object.keys(query).length > 0 ? query : null;
}

export function buildAiSessionRecords(
  data: Partial<Record<AiDomain, AiContextRecord[]>> | null | undefined,
  isFeatureEnabled: (featureId: FeatureId) => boolean,
) {
  return AI_DOMAINS.reduce<Partial<Record<AiDomain, AiContextRecord[]>>>((acc, domain) => {
    if (!isFeatureEnabled(AI_DOMAIN_FEATURES[domain])) return acc;
    acc[domain] = data?.[domain] ?? [];
    return acc;
  }, {});
}

export function SessionAiAssistantProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const spaceId = session.space?.id ?? null;
  const userId = session.user?.id ?? null;
  const query = useMemo(
    () => buildAiSessionQuery(spaceId, session.isFeatureEnabled),
    [spaceId, session.isFeatureEnabled],
  );

  const { data } = db.useQuery(query as any);

  const records = useMemo(
    () => buildAiSessionRecords(data as Partial<Record<AiDomain, AiContextRecord[]>> | undefined, session.isFeatureEnabled),
    [data, session.isFeatureEnabled],
  );
  const allowedDomains = useMemo(
    () => Object.keys(records) as AiDomain[],
    [records],
  );

  const contextPrompt = useMemo(
    () =>
      buildAiContextPrompt({
        userId: userId ?? 'unknown',
        userName: session.user?.displayName ?? session.user?.email ?? null,
        spaceId: spaceId ?? 'none',
        spaceMode: session.mode,
        partnerName: session.partner?.displayName ?? null,
        today: new Date().toISOString().slice(0, 10),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
        records,
      }),
    [
      records,
      session.mode,
      session.partner?.displayName,
      session.user?.displayName,
      session.user?.email,
      spaceId,
      userId,
    ],
  );

  return (
    <AiAssistantProvider
      contextPrompt={contextPrompt}
      records={records}
      allowedDomains={allowedDomains}
      mutationContext={{ coupleId: spaceId, userId }}
    >
      {children}
    </AiAssistantProvider>
  );
}
