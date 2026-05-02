import React, { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/lib/session';
import { AiAssistantProvider } from './provider';
import { buildAiContextPrompt } from './context';
import type { AiDomain } from './types';

export function SessionAiAssistantProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const spaceId = session.space?.id ?? null;
  const userId = session.user?.id ?? null;

  const { data } = db.useQuery(
    spaceId
      ? {
          reminders: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          tasks: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          taskLists: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          events: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          loveNotes: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          checkIns: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          expenses: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          wishlists: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          wishlistItems: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          milestones: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          plans: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          journalEntries: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          timetables: { $: { where: { 'couple.id': spaceId } }, couple: {} },
          timetableItems: { $: { where: { 'couple.id': spaceId } }, couple: {} },
        }
      : null,
  );

  const records = useMemo(
    () =>
      ({
        reminders: data?.reminders ?? [],
        tasks: data?.tasks ?? [],
        taskLists: data?.taskLists ?? [],
        events: data?.events ?? [],
        loveNotes: data?.loveNotes ?? [],
        checkIns: data?.checkIns ?? [],
        expenses: data?.expenses ?? [],
        wishlists: data?.wishlists ?? [],
        wishlistItems: data?.wishlistItems ?? [],
        milestones: data?.milestones ?? [],
        plans: data?.plans ?? [],
        journalEntries: data?.journalEntries ?? [],
        timetables: data?.timetables ?? [],
        timetableItems: data?.timetableItems ?? [],
      }) satisfies Partial<Record<AiDomain, unknown[]>>,
    [data],
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
      mutationContext={{ coupleId: spaceId, userId }}
    >
      {children}
    </AiAssistantProvider>
  );
}
