import { describe, expect, it } from "vitest";

import {
  createJournalEntry,
  deleteJournalEntry,
  generateJournalImageUploadUrl,
  getJournalEntries,
  updateJournalEntry,
} from "./journalEntries";

type Identity = {
  tokenIdentifier: string;
  subject: string;
  issuer: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
};

function createMemoryDb() {
  const tables: Record<string, Array<Record<string, unknown> & { _id: string }>> = {
    users: [],
    couples: [],
    memberships: [],
    journalEntries: [],
  };
  let nextId = 0;

  const clone = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T;

  return {
    tables,
    async insert(table: string, doc: Record<string, unknown>) {
      const stored = {
        _id: `${table}:${++nextId}`,
        _creationTime: nextId,
        ...clone(doc),
      };
      tables[table].push(stored);
      return stored._id;
    },
    async patch(id: string, updates: Record<string, unknown>) {
      for (const table of Object.values(tables)) {
        const row = table.find((doc) => doc._id === id);
        if (row) {
          Object.assign(row, clone(updates));
          return;
        }
      }
      throw new Error(`missing doc ${id}`);
    },
    async delete(id: string) {
      for (const table of Object.values(tables)) {
        const index = table.findIndex((doc) => doc._id === id);
        if (index >= 0) {
          table.splice(index, 1);
          return;
        }
      }
      throw new Error(`missing doc ${id}`);
    },
    async get(id: string) {
      for (const table of Object.values(tables)) {
        const row = table.find((doc) => doc._id === id);
        if (row) {
          return clone(row);
        }
      }
      return null;
    },
    query(table: string) {
      const rows = tables[table] ?? [];
      const buildApi = (filteredRows: typeof rows) => {
        const api = {
          async collect() {
            return filteredRows.map(clone);
          },
          async unique() {
            return clone(filteredRows[0] ?? null);
          },
          withIndex(_indexName: string, builder: (q: { eq(field: string, value: unknown): unknown }) => unknown) {
            const criteria: Record<string, unknown> = {};
            const q = {
              eq(field: string, value: unknown) {
                criteria[field] = value;
                return q;
              },
            };
            builder(q);
            const nextRows = rows.filter((row) =>
              Object.entries(criteria).every(([field, value]) => row[field] === value),
            );
            return buildApi(nextRows);
          },
          order() {
            return api;
          },
          take(count: number) {
            return filteredRows.slice(0, count).map(clone);
          },
        };
        return api;
      };
      return buildApi(rows);
    },
  };
}

function createMemoryStorage() {
  const urls = new Map<string, string>();
  const deleted: string[] = [];
  let uploadCounter = 0;

  return {
    deleted,
    setUrl(storageId: string, url: string) {
      urls.set(storageId, url);
    },
    async generateUploadUrl() {
      uploadCounter += 1;
      return `https://upload.test/${uploadCounter}`;
    },
    async getUrl(storageId: string) {
      return urls.get(storageId) ?? null;
    },
    async delete(storageId: string) {
      deleted.push(storageId);
      urls.delete(storageId);
    },
  };
}

function makeCtx(identity: Identity | null, db = createMemoryDb(), storage = createMemoryStorage()) {
  return {
    auth: {
      async getUserIdentity() {
        return identity;
      },
    },
    db,
    storage,
  };
}

async function runMutation(fn: unknown, ctx: ReturnType<typeof makeCtx>, args: Record<string, unknown>): Promise<any> {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(ctx, args);
}

async function runQuery(fn: unknown, ctx: ReturnType<typeof makeCtx>, args: Record<string, unknown> = {}): Promise<any> {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(ctx, args);
}

function seedActiveCouple(db: ReturnType<typeof createMemoryDb>) {
  const now = Date.now();
  const userId = "users:1";
  const coupleId = "couples:2";

  db.tables.users.push({
    _id: userId,
    _creationTime: now,
    authSubject: "user-1",
    authIssuer: "https://api.workos.com/user_management/test-client",
    tokenIdentifier: "workos:user-1",
    email: "casey@example.com",
    displayName: "Casey Stone",
    preferences: {},
    createdAt: now,
    updatedAt: now,
  });
  db.tables.couples.push({
    _id: coupleId,
    _creationTime: now,
    name: "Casey and Riley",
    inviteCode: null,
    anniversary: null,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });
  db.tables.memberships.push({
    _id: "memberships:3",
    _creationTime: now,
    userId,
    coupleId,
    role: "creator",
    status: "active",
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return { userId, coupleId };
}

describe("journalEntries", () => {
  it("resolves storage-backed image refs and preserves legacy URL entries", async () => {
    const db = createMemoryDb();
    const storage = createMemoryStorage();
    const { userId, coupleId } = seedActiveCouple(db);
    storage.setUrl("storage:a", "https://cdn.test/a.jpg");
    storage.setUrl("storage:b", "https://cdn.test/b.jpg");

    db.tables.journalEntries.push({
      _id: "journalEntries:10",
      _creationTime: 10,
      coupleId,
      authorId: userId,
      title: "Legacy",
      body: "Old entry",
      mood: null,
      isPrivate: false,
      mediaUrls: ["https://legacy.test/old.jpg"],
      tags: [],
      entryDate: "2026-03-24",
      createdAt: 10,
      updatedAt: 10,
    });
    db.tables.journalEntries.push({
      _id: "journalEntries:11",
      _creationTime: 11,
      coupleId,
      authorId: userId,
      title: "Trip",
      body: "Photos included",
      mood: null,
      isPrivate: false,
      mediaStorageIds: ["storage:a", "storage:b"],
      tags: [],
      entryDate: "2026-03-25",
      createdAt: 11,
      updatedAt: 11,
    });

    const ctx = makeCtx(
      {
        tokenIdentifier: "workos:user-1",
        subject: "user-1",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "casey@example.com",
        name: "Casey Stone",
      },
      db,
      storage,
    );

    const entries = await runQuery(getJournalEntries, ctx);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Trip",
      mediaUrls: ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"],
    });
    expect(entries[1]).toMatchObject({
      title: "Legacy",
      mediaUrls: ["https://legacy.test/old.jpg"],
    });
  });

  it("supports create, update, delete, and upload-url generation for journal images", async () => {
    const db = createMemoryDb();
    const storage = createMemoryStorage();
    seedActiveCouple(db);
    storage.setUrl("storage:1", "https://cdn.test/1.jpg");
    storage.setUrl("storage:2", "https://cdn.test/2.jpg");
    storage.setUrl("storage:3", "https://cdn.test/3.jpg");

    const ctx = makeCtx(
      {
        tokenIdentifier: "workos:user-1",
        subject: "user-1",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "casey@example.com",
        name: "Casey Stone",
      },
      db,
      storage,
    );

    const uploadUrl = await runMutation(generateJournalImageUploadUrl, ctx, {});
    expect(uploadUrl).toBe("https://upload.test/1");

    const created = await runMutation(createJournalEntry, ctx, {
      title: "Lake walk",
      body: "Sunset photos",
      entryDate: "2026-03-26",
      mediaStorageIds: ["storage:1", "storage:2"],
    });
    expect(created).toMatchObject({
      title: "Lake walk",
      mediaUrls: ["https://cdn.test/1.jpg", "https://cdn.test/2.jpg"],
    });

    const updated = await runMutation(updateJournalEntry, ctx, {
      entryId: created._id,
      body: "Updated body",
      mediaStorageIds: ["storage:3"],
    });
    expect(updated.mediaUrls).toEqual(["https://cdn.test/3.jpg"]);
    expect(storage.deleted).toEqual(["storage:1", "storage:2"]);

    await runMutation(deleteJournalEntry, ctx, {
      entryId: created._id,
    });
    expect(storage.deleted).toEqual(["storage:1", "storage:2", "storage:3"]);
    expect(db.tables.journalEntries).toHaveLength(0);
  });
});
