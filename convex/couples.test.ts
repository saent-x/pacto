import { describe, expect, it } from "vitest";
import {
  createCouple,
  getActiveCouple,
  getPartnerPresenceSummary,
  joinCoupleByInviteCode,
} from "./couples";

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

describe("couples", () => {
  it("creates a couple and membership for the creator", async () => {
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

    const result = (await runMutation(createCouple, ctx, {
      name: "Casey and Riley",
      anniversary: "2026-03-22",
    })) as {
      couple: { _id: string; name: string; inviteCode: string | null };
      membership: { userId: string; coupleId: string; role: string };
      inviteCode: string;
    };

    expect(result.couple.name).toBe("Casey and Riley");
    expect(result.couple.inviteCode).toBe(result.inviteCode);
    expect(result.membership.role).toBe("creator");

    expect(db.tables.couples).toHaveLength(1);
    expect(db.tables.memberships).toHaveLength(1);
    expect(db.tables.memberships[0]).toMatchObject({
      role: "creator",
      status: "active",
    });

    const activeCouple = await runQuery(getActiveCouple, ctx);
    expect(activeCouple).toMatchObject({
      couple: {
        name: "Casey and Riley",
      },
      membership: {
        role: "creator",
      },
      memberCount: 1,
      partner: null,
    });
  });

  it("joins a second member by invite code", async () => {
    const db = createMemoryDb();
    const creatorCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-1",
        subject: "user-1",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "casey@example.com",
        name: "Casey Stone",
      },
      db,
    );

    const created = (await runMutation(createCouple, creatorCtx, {
      name: "Casey and Riley",
    })) as {
      inviteCode: string;
      couple: { _id: string };
    };

    const partnerCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-2",
        subject: "user-2",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "riley@example.com",
        name: "Riley Blue",
      },
      db,
    );

    const joined = (await runMutation(joinCoupleByInviteCode, partnerCtx, {
      inviteCode: created.inviteCode,
    })) as {
      couple: { _id: string; inviteCode: string | null };
      membership: { userId: string; coupleId: string; role: string };
      memberCount: number;
    };

    expect(joined.couple._id).toBe(created.couple._id);
    expect(joined.couple.inviteCode).toBeNull();
    expect(joined.membership.role).toBe("partner");
    expect(joined.memberCount).toBe(2);

    const summary = await runQuery(getPartnerPresenceSummary, partnerCtx);
    expect(summary).toMatchObject({
      coupleName: "Casey and Riley",
      relationshipState: "paired",
      memberCount: 2,
      partner: {
        displayName: "Casey Stone",
      },
      self: {
        displayName: "Riley Blue",
      },
    });
  });

  it("rejects an invalid or already-consumed invite code", async () => {
    const db = createMemoryDb();
    const creatorCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-1",
        subject: "user-1",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "casey@example.com",
        name: "Casey Stone",
      },
      db,
    );
    const created = (await runMutation(createCouple, creatorCtx, {
      name: "Casey and Riley",
    })) as { inviteCode: string };

    const strangerCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-3",
        subject: "user-3",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "sam@example.com",
        name: "Sam Green",
      },
      db,
    );

    await expect(
      runMutation(joinCoupleByInviteCode, strangerCtx, {
        inviteCode: "NOPE1234",
      }),
    ).rejects.toThrow(/invite code/i);

    const partnerCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-2",
        subject: "user-2",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "riley@example.com",
        name: "Riley Blue",
      },
      db,
    );

    await runMutation(joinCoupleByInviteCode, partnerCtx, {
      inviteCode: created.inviteCode,
    });

    const lateCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-4",
        subject: "user-4",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "morgan@example.com",
        name: "Morgan Gray",
      },
      db,
    );

    await expect(
      runMutation(joinCoupleByInviteCode, lateCtx, {
        inviteCode: created.inviteCode,
      }),
    ).rejects.toThrow(/invite code/i);
  });

  it("ignores left memberships when resolving the active couple", async () => {
    const db = createMemoryDb();
    const userCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-1",
        subject: "user-1",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "casey@example.com",
        name: "Casey Stone",
      },
      db,
    );

    await db.insert("users", {
      authSubject: "user-1",
      authIssuer: "https://api.workos.com/user_management/test-client",
      tokenIdentifier: "workos:user-1",
      email: "casey@example.com",
      displayName: "Casey Stone",
      preferences: {},
      createdAt: 1,
      updatedAt: 1,
    });
    const oldCoupleId = await db.insert("couples", {
      name: "Old Couple",
      inviteCode: null,
      anniversary: null,
      createdBy: "users:1",
      createdAt: 1,
      updatedAt: 1,
    });
    await db.insert("memberships", {
      userId: "users:1",
      coupleId: oldCoupleId,
      role: "partner",
      status: "left",
      joinedAt: 1,
      createdAt: 1,
      updatedAt: 2,
    });

    expect(await runQuery(getActiveCouple, userCtx)).toBeNull();

    const created = await runMutation(createCouple, userCtx, {
      name: "Fresh Start",
    });
    expect(created.couple.name).toBe("Fresh Start");
  });

  it("rejects joining when already active in another couple", async () => {
    const db = createMemoryDb();
    const activeCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-1",
        subject: "user-1",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "casey@example.com",
        name: "Casey Stone",
      },
      db,
    );
    const creatorCtx = makeCtx(
      {
        tokenIdentifier: "workos:user-2",
        subject: "user-2",
        issuer: "https://api.workos.com/user_management/test-client",
        email: "riley@example.com",
        name: "Riley Blue",
      },
      db,
    );

    const firstCouple = await runMutation(createCouple, activeCtx, {
      name: "Casey and Someone",
    });
    const invite = (await runMutation(createCouple, creatorCtx, {
      name: "Riley and Someone",
    })) as { inviteCode: string };

    expect(firstCouple.inviteCode).toBeTruthy();
    await expect(
      runMutation(joinCoupleByInviteCode, activeCtx, {
        inviteCode: invite.inviteCode,
      }),
    ).rejects.toThrow(/already belong to a couple/i);
  });
});
