import type { DailyVerse } from './dailyVerse';

export type TimelineItem = {
  id: string;
  type: 'event' | 'plan' | 'reminder' | 'task' | 'ritual' | 'memory';
  sourceId: string;
  sourceTable: string;
  title: string;
  subtitle: string | null;
  occursAt: number | null;
  priority: number;
  isPrivate: boolean;
  isOverdue: boolean;
};

export type FeaturedSignal = {
  kind: 'checkIn' | 'loveNote' | 'memory' | 'countdown' | 'presence';
  sourceId: string;
  sourceTable: string;
  title: string;
  body: string;
  occursAt: number | null;
};

export type MilestoneStripItem = {
  id: string;
  type: 'countdown' | 'milestone';
  title: string;
  subtitle: string | null;
  date: string;
  daysUntil: number;
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
  milestones: MilestoneStripItem[];
  memories: MemoryPreview[];
  memoryPreview: MemoryPreview | null;
  presence: PresenceInfo | null;
  dailyVerse: DailyVerse;
};

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  itemCount: number;
  kinds: Array<TimelineItem['type'] | 'milestone'>;
};

export type CalendarView = {
  month: string;
  monthLabel: string;
  selectedDate: string | null;
  days: CalendarDay[];
  agenda: TimelineItem[];
  milestones: MilestoneStripItem[];
};
