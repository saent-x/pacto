import React, { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/lib/session';
import type { FeatureId } from '@/src/lib/features/registry';
import { childRowMatchesParentSpace, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import { AiAssistantProvider } from './provider';
import { buildAiContextPrompt } from './context';
import { getLocalAiDateKey } from './date';
import type { AiContextRecord } from './context';
import { AI_DOMAINS, type AiDomain, type AiTargetOwnerMap, type AiTargetSpaceMap } from './types';

const AI_DOMAIN_FEATURES: Record<AiDomain, FeatureId> = {
  reminders: 'recurring',
  tasks: 'tasks',
  taskLists: 'tasks',
  events: 'calendar',
  checkIns: 'checkins',
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
  checkIns: 'couple',
  plans: 'couple',
  journalEntries: 'couple',
  timetables: 'couple',
  timetableItems: 'couple',
};

const AI_DOMAIN_OWNER_RELATION: Partial<Record<AiDomain, 'createdBy' | 'author'>> = {
  reminders: 'createdBy',
  tasks: 'createdBy',
  taskLists: 'createdBy',
  events: 'createdBy',
  checkIns: 'author',
  plans: 'createdBy',
  journalEntries: 'author',
  timetables: 'createdBy',
};

const AI_CONTEXT_QUERY_LIMIT = 100;

type AiSessionRecordOptions = {
  personalSpaceId?: string | null;
  userId?: string | null;
};

export function buildAiSessionQuery(
  spaceId: string | string[] | null,
  isFeatureEnabled: (featureId: FeatureId) => boolean,
) {
  const spaceIds = Array.isArray(spaceId) ? uniqueSpaceIds(spaceId) : uniqueSpaceIds([spaceId]);
  if (spaceIds.length === 0) return null;
  const query = AI_DOMAINS.reduce<Record<string, unknown>>((acc, domain) => {
    if (!isFeatureEnabled(AI_DOMAIN_FEATURES[domain])) return acc;
    const relation = AI_DOMAIN_RELATION[domain];
    acc[domain] = {
      $: {
        where: relationWhere(relation, spaceIds),
        order: { updatedAt: 'desc' },
        limit: AI_CONTEXT_QUERY_LIMIT,
      },
      [relation]: {},
      ...ownerRelations(domain),
      ...childParentRelations(domain),
    };
    return acc;
  }, {});
  return Object.keys(query).length > 0 ? query : null;
}

export function buildAiSessionRecords(
  data: Partial<Record<AiDomain, AiContextRecord[]>> | null | undefined,
  isFeatureEnabled: (featureId: FeatureId) => boolean,
  options: AiSessionRecordOptions = {},
) {
  return AI_DOMAINS.reduce<Partial<Record<AiDomain, AiContextRecord[]>>>((acc, domain) => {
    if (!isFeatureEnabled(AI_DOMAIN_FEATURES[domain])) return acc;
    acc[domain] = filterAiDomainRecords(domain, data?.[domain] ?? [], options);
    return acc;
  }, {});
}

export function buildAiRelationSpaceMap(records: Partial<Record<AiDomain, AiContextRecord[]>>) {
  const relationSpaceById: Record<string, string> = {};
  collectRelationSpaces(records.taskLists, relationSpaceById);
  collectRelationSpaces(records.timetables, relationSpaceById);
  return relationSpaceById;
}

export function buildAiTargetSpaceMap(records: Partial<Record<AiDomain, AiContextRecord[]>>) {
  const targetSpaceById: AiTargetSpaceMap = {};
  for (const domain of AI_DOMAINS) {
    const domainTargets: Record<string, string> = {};
    collectRelationSpaces(filterAiDomainRecords(domain, records[domain] ?? []), domainTargets);
    if (Object.keys(domainTargets).length > 0) {
      targetSpaceById[domain] = domainTargets;
    }
  }
  return targetSpaceById;
}

export function buildAiTargetOwnerMap(records: Partial<Record<AiDomain, AiContextRecord[]>>) {
  const targetOwnerById: AiTargetOwnerMap = {};
  for (const domain of AI_DOMAINS) {
    const domainOwners: Record<string, string> = {};
    for (const record of filterAiDomainRecords(domain, records[domain] ?? [])) {
      const recordId = typeof record.id === 'string' ? record.id : null;
      const ownerId = recordOwnerId(domain, record);
      if (recordId && ownerId) {
        domainOwners[recordId] = ownerId;
      }
    }
    if (Object.keys(domainOwners).length > 0) {
      targetOwnerById[domain] = domainOwners;
    }
  }
  return targetOwnerById;
}

function childParentRelations(domain: AiDomain): Record<string, unknown> {
  if (domain === 'tasks') return { list: { couple: {}, createdBy: {} } };
  if (domain === 'timetableItems') return { timetable: { couple: {}, createdBy: {} } };
  return {};
}

function ownerRelations(domain: AiDomain): Record<string, unknown> {
  const ownerRelation = AI_DOMAIN_OWNER_RELATION[domain];
  return ownerRelation ? { [ownerRelation]: {} } : {};
}

function filterAiDomainRecords(
  domain: AiDomain,
  records: AiContextRecord[],
  options: AiSessionRecordOptions = {},
): AiContextRecord[] {
  const parentScoped = domain === 'tasks'
    ? records.filter((record) => childRowMatchesParentSpace(record, 'list'))
    : domain === 'timetableItems'
    ? records.filter((record) => childRowMatchesParentSpace(record, 'timetable'))
    : records;
  return parentScoped.filter((record) => aiRecordVisibleForPersonalSpace(domain, record, options));
}

export function SessionAiAssistantProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const spaceId = session.space?.id ?? null;
  const readableSpaceIds = useMemo(
    () => uniqueSpaceIds([
      session.personalSpaceId ?? spaceId,
      session.sharedSpaceId ?? spaceId,
    ]),
    [session.personalSpaceId, session.sharedSpaceId, spaceId],
  );
  const userId = session.user?.id ?? null;
  const query = useMemo(
    () => buildAiSessionQuery(readableSpaceIds, session.isFeatureEnabled),
    [readableSpaceIds, session.isFeatureEnabled],
  );

  const { data } = db.useQuery(query as any);

  const records = useMemo(
    () => buildAiSessionRecords(
      data as Partial<Record<AiDomain, AiContextRecord[]>> | undefined,
      session.isFeatureEnabled,
      { personalSpaceId: session.personalSpaceId, userId },
    ),
    [data, session.isFeatureEnabled, session.personalSpaceId, userId],
  );
  const allowedDomains = useMemo(
    () => Object.keys(records) as AiDomain[],
    [records],
  );
  const assignableUserIds = useMemo(
    () => uniqueSpaceIds([
      userId,
      ...session.members.map((member) => member.id),
    ]),
    [session.members, userId],
  );
  const relationSpaceById = useMemo(() => buildAiRelationSpaceMap(records), [records]);
  const targetSpaceById = useMemo(() => buildAiTargetSpaceMap(records), [records]);
  const targetOwnerById = useMemo(() => buildAiTargetOwnerMap(records), [records]);

  const contextPrompt = useMemo(
    () =>
      buildAiContextPrompt({
        userId: userId ?? 'unknown',
        userName: session.user?.displayName ?? session.user?.email ?? null,
        spaceId: spaceId ?? 'none',
        spaceMode: session.mode,
        partnerName: session.partner?.displayName ?? null,
        today: getLocalAiDateKey(),
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
      mutationContext={{
        coupleId: spaceId,
        personalSpaceId: session.personalSpaceId,
        sharedSpaceId: session.sharedSpaceId,
        assignableUserIds,
        relationSpaceById,
        targetSpaceById,
        targetOwnerById,
        userId,
      }}
    >
      {children}
    </AiAssistantProvider>
  );
}

function collectRelationSpaces(
  records: AiContextRecord[] | undefined,
  relationSpaceById: Record<string, string>,
) {
  for (const record of records ?? []) {
    const recordId = typeof record.id === 'string' ? record.id : null;
    const spaceId = recordSpaceId(record);
    if (recordId && typeof spaceId === 'string' && spaceId.length > 0) {
      relationSpaceById[recordId] = spaceId;
    }
  }
}

function recordSpaceId(record: AiContextRecord) {
  return (
    firstRel(record.couple)?.id ??
    firstRel(record.space)?.id ??
    firstRel(firstRel(record.list)?.couple)?.id ??
    firstRel(firstRel(record.timetable)?.couple)?.id
  );
}

function aiRecordVisibleForPersonalSpace(
  domain: AiDomain,
  record: AiContextRecord,
  options: AiSessionRecordOptions,
) {
  const personalSpaceId = options.personalSpaceId ?? null;
  if (!personalSpaceId || recordSpaceId(record) !== personalSpaceId) return true;
  const ownerId = recordOwnerId(domain, record);
  return !(ownerId && ownerId !== options.userId);
}

function recordOwnerId(domain: AiDomain, record: AiContextRecord): string | null {
  if (domain === 'checkIns' || domain === 'journalEntries') {
    return firstRel(record.author)?.id ?? null;
  }
  if (domain === 'timetableItems') {
    return firstRel(firstRel(record.timetable)?.createdBy)?.id ?? null;
  }
  if (domain === 'tasks') {
    return firstRel(record.createdBy)?.id ?? firstRel(firstRel(record.list)?.createdBy)?.id ?? null;
  }
  return firstRel(record.createdBy)?.id ?? null;
}

function firstRel(value: unknown): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
