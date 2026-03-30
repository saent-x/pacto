import { describe, expect, it } from "vitest";
import { getHomeView } from "./timeline";

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
      events: [],
      plans: [],
      rituals: [],
      checkIns: [],
      reminders: [],
      tasks: [],
      milestones: [],
      journalEntries: [],
      loveNotes: [],
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
          withIndex(
            _indexName: string,
            builder: (q: { eq(field: string, value: unknown): unknown }) => unknown,
          ) {
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
  const ctx = {
    auth: {
      async getUserIdentity() {
        return identity;
      },
    },
    db,
    async runQuery(fn: unknown, args: Record<string, unknown> = {}) {
      return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(
        ctx,
        args,
      );
    },
  };
  return ctx;
}

async function runQuery(
  fn: unknown,
  ctx: ReturnType<typeof makeCtx>,
  args: Record<string, unknown> = {},
): Promise<any> {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(
    ctx,
    args,
  );
}

function at(iso: string) {
  return new Date(iso).getTime();
}

async function seedActiveCouple(db = createMemoryDb()) {
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

  const selfId = await db.insert("users", {
    authSubject: "user-1",
    authIssuer: "https://api.workos.com/user_management/test-client",
    tokenIdentifier: "workos:user-1",
    email: "casey@example.com",
    displayName: "Casey Stone",
    preferences: {},
    createdAt: 1,
    updatedAt: 1,
  });
  const partnerId = await db.insert("users", {
    authSubject: "user-2",
    authIssuer: "https://api.workos.com/user_management/test-client",
    tokenIdentifier: "workos:user-2",
    email: "riley@example.com",
    displayName: "Riley Blue",
    preferences: {},
    createdAt: 2,
    updatedAt: 2,
  });
  const coupleId = await db.insert("couples", {
    name: "Casey and Riley",
    inviteCode: null,
    anniversary: "2026-03-25",
    createdBy: selfId,
    createdAt: 3,
    updatedAt: 3,
  });

  await db.insert("memberships", {
    userId: selfId,
    coupleId,
    role: "creator",
    status: "active",
    joinedAt: 3,
    createdAt: 3,
    updatedAt: 3,
  });
  await db.insert("memberships", {
    userId: partnerId,
    coupleId,
    role: "partner",
    status: "active",
    joinedAt: 4,
    createdAt: 4,
    updatedAt: 4,
  });

  return { ctx, db, selfId, partnerId, coupleId };
}

describe("timeline", () => {
  it("excludes private records and normalizes plans and events into timeline items", async () => {
    const { ctx, db, coupleId, selfId } = await seedActiveCouple();

    await db.insert("events", {
      coupleId,
      createdBy: selfId,
      title: "Shared dinner",
      description: "At the corner table",
      startsAt: at("2026-03-22T19:00:00.000Z"),
      endsAt: at("2026-03-22T21:00:00.000Z"),
      isPrivate: false,
      createdAt: at("2026-03-20T09:00:00.000Z"),
      updatedAt: at("2026-03-20T09:00:00.000Z"),
    });
    await db.insert("events", {
      coupleId,
      createdBy: selfId,
      title: "Private surprise",
      startsAt: at("2026-03-22T20:00:00.000Z"),
      isPrivate: true,
      createdAt: at("2026-03-20T10:00:00.000Z"),
      updatedAt: at("2026-03-20T10:00:00.000Z"),
    });
    await db.insert("plans", {
      coupleId,
      createdBy: selfId,
      title: "Paris planning",
      description: "Book train tickets",
      targetDate: "2026-03-24",
      status: "active",
      priority: 3,
      isPrivate: false,
      createdAt: at("2026-03-20T11:00:00.000Z"),
      updatedAt: at("2026-03-20T11:00:00.000Z"),
    });
    await db.insert("plans", {
      coupleId,
      createdBy: selfId,
      title: "Secret proposal plan",
      targetDate: "2026-03-24",
      status: "active",
      isPrivate: true,
      createdAt: at("2026-03-20T12:00:00.000Z"),
      updatedAt: at("2026-03-20T12:00:00.000Z"),
    });

    const result = await runQuery(getHomeView, ctx, {
      now: at("2026-03-22T12:00:00.000Z"),
      previewDays: 7,
    });

    expect(result.timeline.map((item: any) => item.title)).toContain("Shared dinner");
    expect(result.timeline.map((item: any) => item.title)).toContain("Paris planning");
    expect(result.timeline.map((item: any) => item.title)).not.toContain("Private surprise");
    expect(result.timeline.map((item: any) => item.title)).not.toContain(
      "Secret proposal plan",
    );
    expect(
      result.timeline.find((item: any) => item.title === "Shared dinner"),
    ).toMatchObject({
      type: "event",
      sourceTable: "events",
      sourceId: expect.stringMatching(/^events:/),
      isPrivate: false,
      occursAt: at("2026-03-22T19:00:00.000Z"),
    });
    expect(
      result.timeline.find((item: any) => item.title === "Paris planning"),
    ).toMatchObject({
      type: "plan",
      sourceTable: "plans",
      sourceId: expect.stringMatching(/^plans:/),
      isPrivate: false,
      occursAt: expect.any(Number),
    });
    expect(result.dailyVerse).toMatchObject({
      source: "fallback",
      dateKey: "2026-03-22",
    });
    expect(result.dailyVerse).not.toHaveProperty("_creationTime");
  });

  it("sorts overdue items before same-day future items", async () => {
    const { ctx, db, coupleId, selfId } = await seedActiveCouple();

    await db.insert("events", {
      coupleId,
      createdBy: selfId,
      title: "Missed lunch reservation",
      startsAt: at("2026-03-21T12:00:00.000Z"),
      isPrivate: false,
      createdAt: at("2026-03-19T10:00:00.000Z"),
      updatedAt: at("2026-03-19T10:00:00.000Z"),
    });
    await db.insert("events", {
      coupleId,
      createdBy: selfId,
      title: "Tonight's concert",
      startsAt: at("2026-03-22T20:00:00.000Z"),
      isPrivate: false,
      createdAt: at("2026-03-19T11:00:00.000Z"),
      updatedAt: at("2026-03-19T11:00:00.000Z"),
    });

    const result = await runQuery(getHomeView, ctx, {
      now: at("2026-03-22T12:00:00.000Z"),
    });

    const titles = result.timeline.map((item: any) => item.title);
    expect(titles.indexOf("Missed lunch reservation")).toBeLessThan(
      titles.indexOf("Tonight's concert"),
    );
  });

  it("orders reminders and tasks due today deterministically", async () => {
    const { ctx, db, coupleId, selfId } = await seedActiveCouple();

    await db.insert("reminders", {
      couple_id: coupleId,
      created_by: selfId,
      title: "Pack snacks",
      due_at: "2026-03-22T09:00:00.000Z",
      priority: 1,
      is_completed: false,
      created_at: "2026-03-20T09:00:00.000Z",
      updated_at: "2026-03-20T09:00:00.000Z",
    });
    await db.insert("reminders", {
      couple_id: coupleId,
      created_by: selfId,
      title: "Call the restaurant",
      due_at: "2026-03-22T09:00:00.000Z",
      priority: 3,
      is_completed: false,
      created_at: "2026-03-20T08:00:00.000Z",
      updated_at: "2026-03-20T08:00:00.000Z",
    });
    await db.insert("reminders", {
      couple_id: coupleId,
      created_by: selfId,
      title: "Leave for the station",
      due_at: "2026-03-22T11:00:00.000Z",
      priority: 2,
      is_completed: false,
      created_at: "2026-03-20T07:00:00.000Z",
      updated_at: "2026-03-20T07:00:00.000Z",
    });

    await db.insert("tasks", {
      couple_id: coupleId,
      created_by: selfId,
      title: "Book sitter",
      due_date: "2026-03-22",
      priority: 3,
      is_completed: false,
      created_at: "2026-03-20T06:00:00.000Z",
      updated_at: "2026-03-20T06:00:00.000Z",
    });
    await db.insert("tasks", {
      couple_id: coupleId,
      created_by: selfId,
      title: "Buy flowers",
      due_date: "2026-03-22",
      priority: 3,
      is_completed: false,
      created_at: "2026-03-20T05:00:00.000Z",
      updated_at: "2026-03-20T05:00:00.000Z",
    });
    await db.insert("tasks", {
      couple_id: coupleId,
      created_by: selfId,
      title: "Water plants",
      due_date: "2026-03-22",
      priority: 1,
      is_completed: false,
      created_at: "2026-03-20T04:00:00.000Z",
      updated_at: "2026-03-20T04:00:00.000Z",
    });

    const result = await runQuery(getHomeView, ctx, {
      now: at("2026-03-22T12:00:00.000Z"),
    });

    expect(
      result.timeline
        .filter((item: any) => item.type === "reminder")
        .map((item: any) => item.title),
    ).toEqual([
      "Call the restaurant",
      "Pack snacks",
      "Leave for the station",
    ]);
    expect(
      result.timeline
        .filter((item: any) => item.type === "task")
        .map((item: any) => item.title),
    ).toEqual(["Book sitter", "Buy flowers", "Water plants"]);
  });

  it("surfaces milestone and countdown items when they are relevant", async () => {
    const { ctx, db, coupleId, selfId } = await seedActiveCouple();

    await db.insert("milestones", {
      couple_id: coupleId,
      created_by: selfId,
      title: "First trip anniversary",
      date: "2026-03-24",
      icon: "plane",
      created_at: "2026-03-20T04:00:00.000Z",
    });

    const result = await runQuery(getHomeView, ctx, {
      now: at("2026-03-22T12:00:00.000Z"),
      previewDays: 7,
    });

    expect(result.milestones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "countdown",
          title: "Anniversary",
          date: "2026-03-25",
        }),
        expect.objectContaining({
          type: "milestone",
          title: "First trip anniversary",
          date: "2026-03-24",
        }),
      ]),
    );
  });

  it("selects the featured relationship signal deterministically from available shared sources", async () => {
    const { ctx, db, coupleId, selfId, partnerId } = await seedActiveCouple();

    await db.insert("journalEntries", {
      coupleId,
      authorId: selfId,
      title: "Long walk",
      body: "We needed that reset.",
      entryDate: "2026-03-21",
      isPrivate: false,
      createdAt: at("2026-03-21T20:00:00.000Z"),
      updatedAt: at("2026-03-21T20:00:00.000Z"),
    });
    await db.insert("loveNotes", {
      coupleId,
      authorId: partnerId,
      body: "Still thinking about our breakfast date.",
      isPrivate: false,
      createdAt: at("2026-03-22T07:00:00.000Z"),
      updatedAt: at("2026-03-22T07:00:00.000Z"),
    });
    await db.insert("checkIns", {
      coupleId,
      authorId: partnerId,
      note: "Proud of how we handled this week.",
      mood: "steady",
      isPrivate: false,
      checkInDate: "2026-03-22",
      createdAt: at("2026-03-22T08:00:00.000Z"),
      updatedAt: at("2026-03-22T08:00:00.000Z"),
    });
    await db.insert("checkIns", {
      coupleId,
      authorId: selfId,
      note: "Private reflection",
      mood: "hopeful",
      isPrivate: true,
      checkInDate: "2026-03-22",
      createdAt: at("2026-03-22T09:00:00.000Z"),
      updatedAt: at("2026-03-22T09:00:00.000Z"),
    });

    const first = await runQuery(getHomeView, ctx, {
      now: at("2026-03-22T12:00:00.000Z"),
    });
    const second = await runQuery(getHomeView, ctx, {
      now: at("2026-03-22T12:00:00.000Z"),
    });

    expect(first.hero).toMatchObject({
      sourceTable: "checkIns",
      body: "Proud of how we handled this week.",
    });
    expect(second.hero).toEqual(first.hero);
  });
});
