import { describe, expect, it } from "vitest";
import { createProfile, getCurrentSessionUser } from "./users";

type Identity = {
  tokenIdentifier: string;
  subject: string;
  issuer: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
};

function createMemoryDb() {
  const tables: Record<string, Array<Record<string, unknown> & { _id: string }>> =
    {
      users: [],
      couples: [],
      memberships: [],
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
          async first() {
            return clone(filteredRows[0] ?? null);
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
          filter() {
            return api;
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

function makeCtx(identity: Identity | null, db = createMemoryDb()) {
  return {
    auth: {
      async getUserIdentity() {
        return identity;
      },
    },
    db,
  };
}

async function runMutation(fn: unknown, ctx: ReturnType<typeof makeCtx>, args: Record<string, unknown>): Promise<any> {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(ctx, args);
}

async function runQuery(fn: unknown, ctx: ReturnType<typeof makeCtx>, args: Record<string, unknown> = {}): Promise<any> {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(ctx, args);
}

describe("users", () => {
  it("creates and returns the current session user", async () => {
    const db = createMemoryDb();
    const ctx = makeCtx(
      {
        tokenIdentifier: "workos:user-1",
        subject: "user-1",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "casey@example.com",
        name: "Casey Stone",
        pictureUrl: "https://example.com/avatar.png",
      },
      db,
    );

    const profile = await runMutation(createProfile, ctx, {
      displayName: "Casey",
      avatarUrl: "https://example.com/avatar.png",
      preferences: { theme: "warm" },
    });

    expect(profile).toMatchObject({
      displayName: "Casey",
      avatarUrl: "https://example.com/avatar.png",
      preferences: { theme: "warm" },
      tokenIdentifier: "workos:user-1",
    });

    const session = await runQuery(getCurrentSessionUser, ctx);
    expect(session).toMatchObject({
      identity: {
        email: "casey@example.com",
        name: "Casey Stone",
      },
      profile: {
        displayName: "Casey",
        tokenIdentifier: "workos:user-1",
      },
      activeCouple: null,
    });
  });

  it("updates an existing profile without dropping existing fields", async () => {
    const db = createMemoryDb();
    const ctx = makeCtx(
      {
        tokenIdentifier: "workos:user-1",
        subject: "user-1",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "casey@example.com",
        name: "Casey Stone",
      },
      db,
    );

    const first = await runMutation(createProfile, ctx, {
      displayName: "Casey",
      avatarUrl: "https://example.com/avatar.png",
      preferences: { theme: "warm" },
    });
    expect(first).toMatchObject({
      displayName: "Casey",
      avatarUrl: "https://example.com/avatar.png",
      preferences: { theme: "warm" },
    });

    const second = await runMutation(createProfile, ctx, {
      displayName: "Casey Updated",
    });
    expect(second).toMatchObject({
      displayName: "Casey Updated",
      avatarUrl: "https://example.com/avatar.png",
      preferences: { theme: "warm" },
    });

    const session = await runQuery(getCurrentSessionUser, ctx);
    expect(session?.profile).toMatchObject({
      displayName: "Casey Updated",
      avatarUrl: "https://example.com/avatar.png",
      preferences: { theme: "warm" },
    });
  });

  it("strips Convex document metadata from the returned session shape", async () => {
    const db = createMemoryDb();
    const creatorCtx = makeCtx(
      {
        tokenIdentifier: "better-auth:user-1",
        subject: "user-1",
        issuer: "https://example.convex.site",
        email: "casey@example.com",
        name: "Casey Stone",
      },
      db,
    );

    await runMutation(createProfile, creatorCtx, {
      displayName: "Casey",
    });

    const creatorId = db.tables.users[0]._id;
    const coupleId = await db.insert("couples", {
      name: "Casey and Riley",
      inviteCode: "ABCDEFGH",
      anniversary: null,
      createdBy: creatorId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.insert("memberships", {
      userId: creatorId,
      coupleId,
      role: "creator",
      status: "active",
      joinedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const session = await runQuery(getCurrentSessionUser, creatorCtx);

    expect(session?.profile?._creationTime).toBeUndefined();
    expect(session?.activeCouple?.couple?._creationTime).toBeUndefined();
    expect(session?.activeCouple?.membership?._creationTime).toBeUndefined();
  });

  it("returns null when no session exists", async () => {
    const session = await runQuery(getCurrentSessionUser, makeCtx(null), {});
    expect(session).toBeNull();
  });
});
