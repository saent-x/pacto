import { init, id } from '@instantdb/admin';
import schema from '../../instant.schema';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';
import type { DailyVerse } from '@/src/lib/home/dailyVerse';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
});

export async function POST(request: Request) {
  const now = Date.now();
  const dateKey = new Date(now).toISOString().slice(0, 10);

  // Check cache first
  const { dailyVerseCache } = await db.query({
    dailyVerseCache: { $: { where: { dateKey } } },
  });

  if (dailyVerseCache[0]) {
    return Response.json({
      text: dailyVerseCache[0].text,
      reference: dailyVerseCache[0].reference,
      translation: dailyVerseCache[0].translation,
      source: dailyVerseCache[0].source,
      dateKey,
    });
  }

  // Fetch from remote API
  let verse: DailyVerse;
  try {
    const response = await fetch(
      'https://labs.bible.org/api/?passage=votd&type=json',
    );
    if (!response.ok) throw new Error('API fetch failed');
    const data = await response.json();
    const entry = Array.isArray(data) ? data[0] : data;
    verse = {
      text: entry.text?.replace(/<[^>]*>/g, '') ?? '',
      reference: `${entry.bookname ?? ''} ${entry.chapter ?? ''}:${entry.verse ?? ''}`.trim(),
      translation: 'NET',
      source: 'remote',
      dateKey,
    };
  } catch {
    verse = getCuratedDailyVerse(dateKey);
  }

  // Cache the verse via admin SDK
  const cacheId = id();
  await db.transact(
    db.tx.dailyVerseCache[cacheId].update({
      dateKey: verse.dateKey,
      text: verse.text,
      reference: verse.reference,
      translation: verse.translation,
      source: verse.source,
      fetchedAt: now,
      createdAt: now,
      updatedAt: now,
    }),
  );

  return Response.json(verse);
}
