import { init } from '@instantdb/admin';
import schema from '../../instant.schema';
import {
  buildTimelineItems,
  buildMemoryPreviews,
  buildMilestones,
  selectFeaturedSignal,
} from '@/src/lib/home/builders';
import type { HomeView, PresenceInfo } from '@/src/lib/home/types';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
});

function emptyHomeView(): HomeView {
  const dateKey = new Date().toISOString().slice(0, 10);
  return {
    hero: null,
    timeline: [],
    milestones: [],
    memories: [],
    memoryPreview: null,
    presence: null,
    dailyVerse: getCuratedDailyVerse(dateKey),
  };
}

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json(emptyHomeView());

  let user;
  try {
    user = await db.auth.verifyToken(token);
  } catch {
    return Response.json(emptyHomeView());
  }
  if (!user) return Response.json(emptyHomeView());

  const { memberships } = await db.query({
    memberships: {
      $: { where: { 'user.id': user.id, status: 'active' } },
      couple: {},
      user: {},
    },
  });

  const activeMembership = memberships[0];
  const couple = activeMembership?.couple?.[0];
  if (!couple) return Response.json(emptyHomeView());

  const coupleId = couple.id;
  const url = new URL(request.url);
  const previewDays = Number(url.searchParams.get('previewDays') ?? '7');
  const now = Date.now();

  const data = await db.query({
    events: { $: { where: { 'couple.id': coupleId } } },
    plans: { $: { where: { 'couple.id': coupleId } } },
    rituals: { $: { where: { 'couple.id': coupleId } } },
    checkIns: { $: { where: { 'couple.id': coupleId } } },
    reminders: { $: { where: { 'couple.id': coupleId } } },
    tasks: { $: { where: { 'couple.id': coupleId } } },
    milestones: { $: { where: { 'couple.id': coupleId } } },
    journalEntries: { $: { where: { 'couple.id': coupleId } }, media: {} },
    loveNotes: { $: { where: { 'couple.id': coupleId } } },
  });

  // Resolve partner
  const { memberships: allMembers } = await db.query({
    memberships: {
      $: { where: { 'couple.id': coupleId, status: 'active' } },
      user: {},
    },
  });

  const partnerMembership = allMembers.find(
    (m) => m.user?.[0]?.id !== user!.id,
  );
  const partnerUser = partnerMembership?.user?.[0];

  const presence: PresenceInfo = {
    coupleId,
    coupleName: couple.name,
    memberCount: allMembers.length,
    relationshipState: partnerUser ? 'paired' : 'waiting',
    self: {
      userId: user.id,
      displayName: (user as any).displayName ?? user.email ?? '',
      avatarUrl: (user as any).avatarUrl ?? null,
    },
    partner: partnerUser
      ? {
          userId: partnerUser.id,
          displayName: (partnerUser as any).displayName ?? (partnerUser as any).email ?? 'Partner',
          avatarUrl: (partnerUser as any).avatarUrl ?? null,
        }
      : null,
    joinedAt: activeMembership.joinedAt,
  };

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

  // Daily verse
  const dateKey = new Date(now).toISOString().slice(0, 10);
  const { dailyVerseCache } = await db.query({
    dailyVerseCache: { $: { where: { dateKey } } },
  });
  const dailyVerse = dailyVerseCache[0]
    ? {
        text: dailyVerseCache[0].text,
        reference: dailyVerseCache[0].reference,
        translation: dailyVerseCache[0].translation,
        source: dailyVerseCache[0].source as 'remote' | 'fallback',
        dateKey,
      }
    : getCuratedDailyVerse(dateKey);

  const hero = selectFeaturedSignal({
    now,
    presence,
    milestones: milestoneStrip,
    memoryPreview,
    checkIns: data.checkIns,
  });

  const view: HomeView = {
    hero,
    timeline,
    milestones: milestoneStrip,
    memories,
    memoryPreview,
    presence,
    dailyVerse,
  };

  return Response.json(view);
}
