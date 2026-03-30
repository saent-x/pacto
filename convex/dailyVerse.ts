import {
  actionGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  queryGeneric,
} from "convex/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  dateKeyForDate,
  getCuratedDailyVerse,
  type DailyVerse,
} from "../src/lib/home/dailyVerse";

const DAILY_VERSE_URL = "https://labs.bible.org/api/?passage=votd&type=json";
const DAILY_VERSE_TRANSLATION = "Bible.org VOTD";

const dailyVerseValidator = v.object({
  text: v.string(),
  reference: v.string(),
  translation: v.string(),
  source: v.union(v.literal("remote"), v.literal("fallback")),
  dateKey: v.string(),
});

const dailyVerseCacheValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  dateKey: v.string(),
  text: v.string(),
  reference: v.string(),
  translation: v.string(),
  source: v.union(v.literal("remote"), v.literal("fallback")),
  fetchedAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

type DailyVerseCacheRecord = {
  _id: string;
  _creationTime: number;
  dateKey: string;
  text: string;
  reference: string;
  translation: string;
  source: DailyVerse["source"];
  fetchedAt: number;
  createdAt: number;
  updatedAt: number;
};

function toDailyVerse(record: DailyVerseCacheRecord): DailyVerse {
  return {
    text: record.text,
    reference: record.reference,
    translation: record.translation,
    source: record.source,
    dateKey: record.dateKey,
  };
}

function readString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumberLike(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function readField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const text = readString(value);
    if (text) {
      return text;
    }
  }
  return null;
}

function composeReference(record: Record<string, unknown>) {
  const book = readField(record, ["bookname", "book"]);
  const chapter = readNumberLike(record.chapter);
  const verse = readNumberLike(record.verse);
  if (!book || !chapter || !verse) {
    return null;
  }
  return `${book} ${chapter}:${verse}`;
}

function unwrapRemotePayload(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) {
    const first = payload[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const data = record.data;
    if (data && typeof data === "object") {
      return data as Record<string, unknown>;
    }
    return record;
  }
  return null;
}

function normalizeRemoteVerse(payload: unknown, dateKey: string): DailyVerse | null {
  const record = unwrapRemotePayload(payload);
  if (!record) {
    return null;
  }

  const text = readField(record, ["text", "verse", "body", "passage"]);
  const reference =
    readField(record, ["reference", "citation", "display_ref", "passageReference"]) ??
    composeReference(record);
  const translation =
    readField(record, ["translation", "version", "translation_name", "label"]) ??
    DAILY_VERSE_TRANSLATION;

  if (!text || !reference) {
    return null;
  }

  return {
    text,
    reference,
    translation,
    source: "remote",
    dateKey,
  };
}

async function fetchRemoteDailyVerse(dateKey: string, fetchVerse: typeof fetch) {
  const response = await fetchVerse(DAILY_VERSE_URL);
  if (!response.ok) {
    throw new Error(`Daily verse request failed with status ${response.status}`);
  }
  return normalizeRemoteVerse(await response.json(), dateKey);
}

async function getCachedDailyVerse(ctx: { db: any }, dateKey: string) {
  return (await ctx.db
    .query("dailyVerseCache")
    .withIndex("by_dateKey", (q: { eq(field: string, value: unknown): unknown }) =>
      q.eq("dateKey", dateKey),
    )
    .unique()) as DailyVerseCacheRecord | null;
}

export async function getDailyVerseForNow(
  ctx: { db: any },
  now: number,
): Promise<DailyVerse> {
  const dateKey = dateKeyForDate(now);
  const cached = await getCachedDailyVerse(ctx, dateKey);
  return cached ? toDailyVerse(cached) : getCuratedDailyVerse(dateKey);
}

export const getDailyVerseCache = internalQueryGeneric({
  args: {
    dateKey: v.string(),
  },
  returns: v.union(dailyVerseCacheValidator, v.null()),
  handler: async (ctx, args) => {
    return getCachedDailyVerse(ctx, args.dateKey);
  },
});

export const upsertDailyVerseCache = internalMutationGeneric({
  args: {
    verse: dailyVerseValidator,
    fetchedAt: v.number(),
  },
  returns: dailyVerseCacheValidator,
  handler: async (ctx, args) => {
    const existing = await getCachedDailyVerse(ctx, args.verse.dateKey);
    const record: DailyVerseCacheRecord = {
      _id: existing?._id ?? `dailyVerseCache:${args.verse.dateKey}`,
      _creationTime: existing?._creationTime ?? args.fetchedAt,
      dateKey: args.verse.dateKey,
      text: args.verse.text,
      reference: args.verse.reference,
      translation: args.verse.translation,
      source: args.verse.source,
      fetchedAt: args.fetchedAt,
      createdAt: existing?.createdAt ?? args.fetchedAt,
      updatedAt: args.fetchedAt,
    };

    if (existing) {
      await ctx.db.patch(existing._id as any, {
        dateKey: record.dateKey,
        text: record.text,
        reference: record.reference,
        translation: record.translation,
        source: record.source,
        fetchedAt: record.fetchedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
      return record;
    }

    const insertedId = await ctx.db.insert("dailyVerseCache", {
      dateKey: record.dateKey,
      text: record.text,
      reference: record.reference,
      translation: record.translation,
      source: record.source,
      fetchedAt: record.fetchedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    return {
      ...record,
      _id: insertedId,
    };
  },
});

async function refreshDailyVerseForNow(
  ctx: {
    runQuery: any;
    runMutation: any;
  },
  now: number,
): Promise<DailyVerse> {
  const dateKey = dateKeyForDate(now);
  const cached = (await ctx.runQuery(
    internal.dailyVerse.getDailyVerseCache,
    { dateKey },
  )) as DailyVerseCacheRecord | null;

  if (cached) {
    return toDailyVerse(cached);
  }

  const resolved =
    (await fetchRemoteDailyVerse(dateKey, fetch).catch(() => null)) ??
    getCuratedDailyVerse(dateKey);
  await ctx.runMutation(internal.dailyVerse.upsertDailyVerseCache, {
    verse: resolved,
    fetchedAt: now,
  });
  return resolved;
}

export const refreshDailyVerse = internalActionGeneric({
  args: {
    now: v.optional(v.number()),
  },
  returns: dailyVerseValidator,
  handler: async (ctx, args): Promise<DailyVerse> => {
    return refreshDailyVerseForNow(ctx, args.now ?? Date.now());
  },
});

export const ensureDailyVerse = actionGeneric({
  args: {
    now: v.optional(v.number()),
  },
  returns: dailyVerseValidator,
  handler: async (ctx, args): Promise<DailyVerse> => {
    return refreshDailyVerseForNow(ctx, args.now ?? Date.now());
  },
});

export const getDailyVerse = queryGeneric({
  args: {
    now: v.optional(v.number()),
  },
  returns: dailyVerseValidator,
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    return getDailyVerseForNow(ctx, now);
  },
});
