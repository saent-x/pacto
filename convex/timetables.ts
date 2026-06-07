import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { Doc } from './_generated/dataModel';
import { assertMember } from './lib/spaces';

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, val]) => val !== undefined));

const ttItem = v.object({
  time: v.string(),
  title: v.string(),
  dur: v.optional(v.string()),
});

type TimetableItem = { time: string; title: string; dur?: string };
const DURATION_MIN_MINUTES = 15;
const DURATION_MAX_MINUTES = 24 * 60;

const normalizeTime = (input: string, fallback = '9:00') => {
  const raw = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!raw || /[^0-9:apm]/.test(raw) || raw.length > 7) return fallback;
  const suffix = raw.endsWith('am') ? 'am' : raw.endsWith('pm') ? 'pm' : undefined;
  const body = suffix ? raw.slice(0, -2) : raw;
  let hour: number;
  let minute: number;

  if (body.includes(':')) {
    const [h, m] = body.split(':');
    if (!h || body.indexOf(':') !== body.lastIndexOf(':')) return fallback;
    hour = Number(h);
    minute = m ? Number(m) : 0;
  } else if (/^\d{1,4}$/.test(body)) {
    if (body.length <= 2) {
      hour = Number(body);
      minute = 0;
    } else if (body.length === 3) {
      if (Number(body[0]) > 2) {
        hour = Number(body.slice(0, 1));
        minute = Number(body.slice(1));
      } else {
        hour = Number(body.slice(0, 2));
        minute = Number(body.slice(2));
      }
    } else {
      hour = Number(body.slice(0, 2));
      minute = Number(body.slice(2));
    }
  } else {
    return fallback;
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return fallback;
  }

  if (suffix) {
    if (hour < 1 || hour > 12) return fallback;
    if (suffix === 'am') hour = hour === 12 ? 0 : hour;
    if (suffix === 'pm') hour = hour === 12 ? 12 : hour + 12;
  } else if (hour < 0 || hour > 23) {
    return fallback;
  }

  return `${hour}:${String(minute).padStart(2, '0')}`;
};

const normalizeDuration = (input: string, fallback = '') => {
  const raw = input.trim().toLowerCase();
  if (!raw) return '';
  if (/[^0-9hm]/.test(raw) || raw.length > 6) return fallback;

  let minutes: number;
  const bare = raw.match(/^(\d{1,4})$/);
  const mins = raw.match(/^(\d{1,4})m$/);
  const hours = raw.match(/^(\d{1,2})h$/);
  const mixed = raw.match(/^(\d{1,2})h(\d{1,2})m?$/);

  if (bare) {
    minutes = Number(bare[1]);
  } else if (mins) {
    minutes = Number(mins[1]);
  } else if (hours) {
    minutes = Number(hours[1]) * 60;
  } else if (mixed) {
    const h = Number(mixed[1]);
    const m = Number(mixed[2]);
    if (m > 59) return fallback;
    minutes = h * 60 + m;
  } else {
    return fallback;
  }

  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > DURATION_MAX_MINUTES) return fallback;

  const safeMinutes = Math.min(DURATION_MAX_MINUTES, Math.max(DURATION_MIN_MINUTES, minutes));
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
};

const normalizeItems = (items?: TimetableItem[], previous?: TimetableItem[]) =>
  items?.map((it, idx) => ({
    ...it,
    time: normalizeTime(it.time, normalizeTime(previous?.[idx]?.time ?? '9:00')),
    dur: normalizeDuration(it.dur ?? '', normalizeDuration(previous?.[idx]?.dur ?? '')),
  }));

export const listTimetables = query({
  args: { spaceId: v.id('spaces') },
  handler: async (ctx, { spaceId }) => {
    await assertMember(ctx, spaceId);
    return await ctx.db
      .query('timetables')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .order('desc')
      .collect();
  },
});

export const getTimetable = query({
  args: { timetableId: v.id('timetables') },
  handler: async (ctx, { timetableId }) => {
    const t = await ctx.db.get(timetableId);
    if (!t) return null;
    await assertMember(ctx, t.spaceId);
    return t;
  },
});

export const createTimetable = mutation({
  args: {
    spaceId: v.id('spaces'),
    title: v.string(),
    share: v.optional(v.string()),
    days: v.optional(v.number()),
    items: v.optional(v.array(ttItem)),
  },
  handler: async (ctx, a) => {
    const { userId } = await assertMember(ctx, a.spaceId);
    return await ctx.db.insert('timetables', {
      spaceId: a.spaceId,
      title: a.title,
      share: a.share,
      days: a.days,
      items: normalizeItems(a.items) ?? [],
      createdBy: userId,
    });
  },
});

export const updateTimetable = mutation({
  args: {
    timetableId: v.id('timetables'),
    title: v.optional(v.string()),
    share: v.optional(v.string()),
    days: v.optional(v.number()),
    items: v.optional(v.array(ttItem)),
  },
  handler: async (ctx, { timetableId, ...fields }) => {
    const t = await ctx.db.get(timetableId);
    if (!t) throw new Error('NOT_FOUND');
    await assertMember(ctx, t.spaceId);
    await ctx.db.patch(timetableId, clean({ ...fields, items: normalizeItems(fields.items, t.items) }) as Partial<Doc<'timetables'>>);
  },
});

export const removeTimetable = mutation({
  args: { timetableId: v.id('timetables') },
  handler: async (ctx, { timetableId }) => {
    const t = await ctx.db.get(timetableId);
    if (!t) throw new Error('NOT_FOUND');
    await assertMember(ctx, t.spaceId);
    await ctx.db.delete(timetableId);
  },
});
