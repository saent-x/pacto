import type { DailyVerse } from './dailyVerse';
import type { ActivityHeatmapDay } from './activity';

export type TimelineItem = {
  id: string;
  type: 'event' | 'plan' | 'reminder' | 'task' | 'ritual' | 'memory';
  sourceId: string;
  sourceParentId?: string | null;
  sourceTable: string;
  title: string;
  subtitle: string | null;
  occursAt: number | null;
  priority: number;
  isPrivate: boolean;
  isOverdue: boolean;
  isCompleted?: boolean;
};

export type FeaturedSignal = {
  kind: 'checkIn' | 'memory' | 'presence';
  sourceId: string;
  sourceTable: string;
  title: string;
  body: string;
  occursAt: number | null;
};

export type MemoryPreview = {
  sourceId: string;
  sourceTable: string;
  title: string;
  body: string;
  createdAt: number;
  mediaUrls: string[];
};

export type PresenceInfo = {
  coupleId: string;
  coupleName: string;
  memberCount: number;
  relationshipState: 'paired' | 'waiting';
  self: { userId: string; displayName: string; avatarUrl: string | null };
  partner: { userId: string; displayName: string; avatarUrl: string | null } | null;
  joinedAt: number;
};

export type HomeView = {
  hero: FeaturedSignal | null;
  timeline: TimelineItem[];
  memories: MemoryPreview[];
  memoryPreview: MemoryPreview | null;
  presence: PresenceInfo | null;
  dailyVerse: DailyVerse;
  activity: ActivityHeatmapDay[];
};

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  itemCount: number;
  kinds: TimelineItem['type'][];
};

export type CalendarView = {
  month: string;
  monthLabel: string;
  selectedDate: string | null;
  days: CalendarDay[];
  agenda: TimelineItem[];
};
