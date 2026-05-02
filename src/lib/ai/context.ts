import type { AiDomain } from './types';

export type AiContextRecord = {
  id: string;
  title?: string | null;
  name?: string | null;
  body?: string | null;
  date?: string | number | null;
  updatedAt?: number | null;
  createdAt?: number | null;
  [key: string]: unknown;
};

export type AiContextSnapshot = {
  userId: string;
  userName?: string | null;
  spaceId: string;
  spaceMode: 'solo' | 'couple' | string;
  partnerName?: string | null;
  today: string;
  timezone: string;
  records: Partial<Record<AiDomain, AiContextRecord[]>>;
};

const DEFAULT_RECORD_LIMIT = 8;

export function buildAiContextPrompt(snapshot: AiContextSnapshot, recordLimit = DEFAULT_RECORD_LIMIT) {
  const lines = [
    `today: ${snapshot.today}`,
    `timezone: ${snapshot.timezone}`,
    `user: ${snapshot.userName ?? snapshot.userId}`,
    `space: ${snapshot.spaceMode}`,
    snapshot.partnerName ? `partner: ${snapshot.partnerName}` : null,
    'relevant records:',
  ].filter(Boolean);

  for (const [domain, records] of Object.entries(snapshot.records)) {
    const visibleRecords = (records ?? [])
      .slice()
      .sort(compareContextRecords)
      .slice(0, recordLimit)
      .map(formatContextRecord);
    lines.push(`${domain}: ${visibleRecords.length ? visibleRecords.join('; ') : 'none'}`);
  }

  return lines.join('\n');
}

function compareContextRecords(left: AiContextRecord, right: AiContextRecord) {
  return getContextTimestamp(right) - getContextTimestamp(left);
}

function getContextTimestamp(record: AiContextRecord) {
  if (typeof record.updatedAt === 'number') return record.updatedAt;
  if (typeof record.createdAt === 'number') return record.createdAt;
  if (typeof record.date === 'number') return record.date;
  if (typeof record.date === 'string') {
    const parsed = Date.parse(record.date);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatContextRecord(record: AiContextRecord) {
  const label = record.title ?? record.name ?? record.body ?? record.id;
  return `${record.id} "${String(label).slice(0, 80)}"`;
}
