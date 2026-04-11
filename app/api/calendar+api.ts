import { init } from '@instantdb/admin';
import schema from '../../instant.schema';
import {
  buildTimelineItems,
  buildMemoryPreviews,
  buildMilestones,
  buildCalendarDays,
  formatMonthLabel,
} from '@/src/lib/home/builders';
import type { CalendarView } from '@/src/lib/home/types';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
});

function toDateString(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function emptyCalendarView(month: string, selectedDate: string | null): CalendarView {
  return {
    month,
    monthLabel: formatMonthLabel(month),
    selectedDate,
    days: [],
    agenda: [],
    milestones: [],
  };
}

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const url = new URL(request.url);
  const now = Date.now();
  const selectedDate = url.searchParams.get('selectedDate') ?? null;
  const month = url.searchParams.get('month') ?? (selectedDate ? selectedDate.slice(0, 7) : toDateString(now).slice(0, 7));

  if (!token) return Response.json(emptyCalendarView(month, selectedDate));

  let user;
  try {
    user = await db.auth.verifyToken(token);
  } catch {
    return Response.json(emptyCalendarView(month, selectedDate));
  }
  if (!user) return Response.json(emptyCalendarView(month, selectedDate));

  const { memberships } = await db.query({
    memberships: {
      $: { where: { 'user.id': user.id, status: 'active' } },
      couple: {},
    },
  });
  const couple = memberships[0]?.couple?.[0];
  if (!couple) return Response.json(emptyCalendarView(month, selectedDate));

  const coupleId = couple.id;
  const previewDays = Math.max(30, 60);

  const data = await db.query({
    events: { $: { where: { 'couple.id': coupleId } } },
    plans: { $: { where: { 'couple.id': coupleId } } },
    rituals: { $: { where: { 'couple.id': coupleId } } },
    reminders: { $: { where: { 'couple.id': coupleId } } },
    tasks: { $: { where: { 'couple.id': coupleId } } },
    milestones: { $: { where: { 'couple.id': coupleId } } },
    journalEntries: { $: { where: { 'couple.id': coupleId } }, media: {} },
    loveNotes: { $: { where: { 'couple.id': coupleId } } },
  });

  const memories = buildMemoryPreviews({
    journalEntries: data.journalEntries,
    loveNotes: data.loveNotes,
  });
  const memoryPreview = memories[0] ?? null;
  const milestoneStrip = buildMilestones({
    now,
    couple: { id: coupleId, anniversary: couple.anniversary ?? null },
    milestones: data.milestones,
  });
  const timeline = buildTimelineItems({
    now,
    previewDays,
    events: data.events,
    plans: data.plans,
    reminders: data.reminders,
    tasks: data.tasks,
    rituals: data.rituals,
    memories: memoryPreview ? [memoryPreview] : [],
  });

  const days = buildCalendarDays({ now, month, items: timeline, milestones: milestoneStrip });
  const agenda = timeline.filter((item) => {
    if (item.occursAt === null) return false;
    const itemDate = toDateString(item.occursAt);
    if (selectedDate) return itemDate === selectedDate;
    return itemDate.startsWith(month);
  });
  const monthMilestones = milestoneStrip.filter((m) => m.date.startsWith(month));

  const view: CalendarView = {
    month,
    monthLabel: formatMonthLabel(month),
    selectedDate,
    days,
    agenda,
    milestones: monthMilestones,
  };

  return Response.json(view);
}
