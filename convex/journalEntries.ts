import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { getActiveCouple, requireActiveCouple, requireAuthenticatedUser } from "./lib/permissions";

type LooseDb = {
  insert(table: string, doc: Record<string, unknown>): Promise<string>;
  patch(id: string, updates: Record<string, unknown>): Promise<void>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<(Record<string, unknown> & { _id: string }) | null>;
  query(table: string): {
    withIndex(
      indexName: string,
      builder: (q: { eq(field: string, value: unknown): unknown }) => unknown,
    ): {
      collect(): Promise<Array<Record<string, unknown> & { _id: string }>>;
    };
  };
};

type JournalEntryRecord = {
  _id: string;
  coupleId: string;
  authorId: string;
  title: string | null;
  body: string;
  mood: string | null;
  isPrivate: boolean;
  mediaStorageIds?: string[];
  mediaUrls?: string[];
  tags: string[];
  entryDate: string;
  createdAt: number;
  updatedAt: number;
};

type LooseStorage = {
  generateUploadUrl(): Promise<string>;
  getUrl(storageId: string): Promise<string | null>;
  delete(storageId: string): Promise<void>;
};

const journalEntryValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  authorId: v.string(),
  title: v.union(v.string(), v.null()),
  body: v.string(),
  mood: v.union(v.string(), v.null()),
  isPrivate: v.boolean(),
  mediaStorageIds: v.optional(v.array(v.string())),
  mediaUrls: v.array(v.string()),
  tags: v.array(v.string()),
  entryDate: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

async function resolveMediaUrls(storage: LooseStorage, mediaStorageIds: string[]) {
  return Promise.all(
    mediaStorageIds.map(async (ref) => {
      if (ref.startsWith("http://") || ref.startsWith("https://")) {
        return ref;
      }
      return (await storage.getUrl(ref)) ?? ref;
    }),
  );
}

function getJournalMediaRefs(doc: JournalEntryRecord) {
  return doc.mediaStorageIds ?? doc.mediaUrls ?? [];
}

async function toJournalEntryRecord(storage: LooseStorage, doc: JournalEntryRecord) {
  return {
    _id: doc._id,
    coupleId: doc.coupleId,
    authorId: doc.authorId,
    title: doc.title,
    body: doc.body,
    mood: doc.mood,
    isPrivate: doc.isPrivate,
    mediaStorageIds: [...getJournalMediaRefs(doc)],
    mediaUrls: await resolveMediaUrls(storage, getJournalMediaRefs(doc)),
    tags: [...doc.tags],
    entryDate: doc.entryDate,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listJournalEntriesForCouple(db: LooseDb, storage: LooseStorage, coupleId: string) {
  const rows = (await db
    .query("journalEntries")
    .withIndex("by_coupleId", (q) => q.eq("coupleId", coupleId))
    .collect()) as JournalEntryRecord[];
  const sortedRows = rows
    .sort((left, right) => right.entryDate.localeCompare(left.entryDate) || right.createdAt - left.createdAt);
  return Promise.all(sortedRows.map((row) => toJournalEntryRecord(storage, row)));
}

async function getJournalEntryOrThrow(db: LooseDb, entryId: string, coupleId: string) {
  const entry = (await db.get(entryId)) as JournalEntryRecord | null;
  if (!entry || entry.coupleId !== coupleId) {
    throw new Error("Journal entry not found.");
  }
  return entry;
}

export const getJournalEntries = queryGeneric({
  args: {},
  returns: v.array(journalEntryValidator),
  handler: async (ctx) => {
    const db = ctx.db as unknown as LooseDb;
    const storage = ctx.storage as unknown as LooseStorage;
    const result = await getActiveCouple(ctx);
    if (!result) return [];
    const entries = await listJournalEntriesForCouple(db, storage, result.couple._id);
    return entries.filter(
      (entry) =>
        !entry.isPrivate || entry.authorId === result.membership.userId,
    );
  },
});

export const generateJournalImageUploadUrl = mutationGeneric({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    await requireActiveCouple(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createJournalEntry = mutationGeneric({
  args: {
    title: v.optional(v.union(v.string(), v.null())),
    body: v.string(),
    mood: v.optional(v.union(v.string(), v.null())),
    isPrivate: v.optional(v.boolean()),
    entryDate: v.string(),
    mediaStorageIds: v.optional(v.array(v.string())),
  },
  returns: journalEntryValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const storage = ctx.storage as unknown as LooseStorage;
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const mediaStorageIds = args.mediaStorageIds ?? [];
    const entryId = await db.insert("journalEntries", {
      coupleId: activeCouple.couple._id,
      authorId: user._id,
      title: args.title ?? null,
      body: args.body,
      mood: args.mood ?? null,
      isPrivate: args.isPrivate ?? false,
      mediaUrls: mediaStorageIds,
      mediaStorageIds,
      tags: [],
      entryDate: args.entryDate,
      createdAt: now,
      updatedAt: now,
    });
    return toJournalEntryRecord(storage, {
      _id: entryId,
      coupleId: activeCouple.couple._id,
      authorId: user._id,
      title: args.title ?? null,
      body: args.body,
      mood: args.mood ?? null,
      isPrivate: args.isPrivate ?? false,
      mediaUrls: mediaStorageIds,
      mediaStorageIds,
      tags: [],
      entryDate: args.entryDate,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateJournalEntry = mutationGeneric({
  args: {
    entryId: v.id("journalEntries"),
    title: v.optional(v.union(v.string(), v.null())),
    body: v.optional(v.string()),
    mood: v.optional(v.union(v.string(), v.null())),
    isPrivate: v.optional(v.boolean()),
    entryDate: v.optional(v.string()),
    mediaStorageIds: v.optional(v.array(v.string())),
  },
  returns: journalEntryValidator,
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const storage = ctx.storage as unknown as LooseStorage;
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await getJournalEntryOrThrow(db, args.entryId, activeCouple.couple._id);
    if (existing.authorId !== user._id) {
      throw new Error("Only the author can edit this journal entry.");
    }
    const existingMediaStorageIds = getJournalMediaRefs(existing).filter(
      (storageId) => !storageId.startsWith("http://") && !storageId.startsWith("https://"),
    );
    const nextMediaStorageIds = args.mediaStorageIds ?? getJournalMediaRefs(existing);
    const removedMediaStorageIds = existingMediaStorageIds.filter(
      (storageId) => !nextMediaStorageIds.includes(storageId),
    );
    const updates = {
      ...(args.title !== undefined ? { title: args.title ?? null } : {}),
      ...(args.body !== undefined ? { body: args.body } : {}),
      ...(args.mood !== undefined ? { mood: args.mood ?? null } : {}),
      ...(args.isPrivate !== undefined ? { isPrivate: args.isPrivate } : {}),
      ...(args.entryDate !== undefined ? { entryDate: args.entryDate } : {}),
      ...(args.mediaStorageIds !== undefined
        ? { mediaUrls: nextMediaStorageIds, mediaStorageIds: nextMediaStorageIds }
        : {}),
      updatedAt: Date.now(),
    };
    await db.patch(args.entryId, updates);
    for (const storageId of removedMediaStorageIds) {
      await storage.delete(storageId);
    }
    return toJournalEntryRecord(storage, { ...existing, ...updates });
  },
});

export const deleteJournalEntry = mutationGeneric({
  args: {
    entryId: v.id("journalEntries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const db = ctx.db as unknown as LooseDb;
    const storage = ctx.storage as unknown as LooseStorage;
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await getJournalEntryOrThrow(db, args.entryId, activeCouple.couple._id);
    if (existing.authorId !== user._id) {
      throw new Error("Only the author can delete this journal entry.");
    }
    await db.delete(args.entryId);
    for (const storageId of getJournalMediaRefs(existing)) {
      if (storageId.startsWith("http://") || storageId.startsWith("https://")) {
        continue;
      }
      await storage.delete(storageId);
    }
    return null;
  },
});
