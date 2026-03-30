import { describe, expect, it, vi } from "vitest";

import { getCuratedDailyVerse, dateKeyForDate } from "../src/lib/home/dailyVerse";
import {
  getDailyVerse,
  getDailyVerseCache,
  refreshDailyVerse,
  upsertDailyVerseCache,
} from "./dailyVerse";

type DailyVerseRecord = {
  dateKey: string;
  text: string;
  reference: string;
  translation: string;
  source: "remote" | "fallback";
  fetchedAt: number;
  createdAt: number;
  updatedAt: number;
  _id: string;
  _creationTime: number;
};

function createMemoryDb() {
  const tables: Record<string, Array<Record<string, unknown> & { _id: string }>> = {
    dailyVerseCache: [],
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

function makeCtx(db = createMemoryDb()) {
  return {
    db,
    runQuery: async (_ref: unknown, args: { dateKey: string }) => {
      return (
        (getDailyVerseCache as unknown as {
          _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
        })._handler({ db }, args)
      );
    },
    runMutation: async (_ref: unknown, args: DailyVerseRecord) => {
      return (
        (upsertDailyVerseCache as unknown as {
          _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
        })._handler({ db }, args)
      );
    },
  };
}

async function runQuery(
  fn: unknown,
  ctx: ReturnType<typeof makeCtx>,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(
    ctx,
    args,
  );
}

async function runAction(
  fn: unknown,
  ctx: ReturnType<typeof makeCtx>,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(
    ctx,
    args,
  );
}

describe("daily verse", () => {
  it("returns a stable fallback verse for a date key", () => {
    const dateKey = dateKeyForDate(new Date("2026-03-26T09:00:00.000Z"));
    expect(dateKey).toBe("2026-03-26");

    const first = getCuratedDailyVerse(dateKey);
    const second = getCuratedDailyVerse(dateKey);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      dateKey: "2026-03-26",
      source: "fallback",
    });
    expect(first.text.length).toBeGreaterThan(0);
    expect(first.reference.length).toBeGreaterThan(0);
  });

  it("warms and reuses the cached verse for the same date", async () => {
    const db = createMemoryDb();
    const ctx = makeCtx(db);
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          bookname: "John",
          chapter: 3,
          verse: 16,
          text: "For God so loved the world that he gave his one and only Son.",
        }),
        { status: 200 },
      ),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock as never);

    const firstRead = (await runQuery(getDailyVerse, ctx, {
      now: new Date("2026-03-26T12:00:00.000Z").getTime(),
    })) as DailyVerseRecord;
    expect(firstRead).toMatchObject({
      source: "fallback",
      dateKey: "2026-03-26",
    });

    const refreshed = (await runAction(refreshDailyVerse, ctx, {
      now: new Date("2026-03-26T12:00:00.000Z").getTime(),
    })) as DailyVerseRecord;

    const cached = (await runQuery(getDailyVerse, ctx, {
      now: new Date("2026-03-26T12:00:00.000Z").getTime(),
    })) as DailyVerseRecord;

    const refreshedAgain = (await runAction(refreshDailyVerse, ctx, {
      now: new Date("2026-03-26T12:00:00.000Z").getTime(),
    })) as DailyVerseRecord;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(refreshed).toMatchObject({
      source: "remote",
      dateKey: "2026-03-26",
      reference: "John 3:16",
    });
    expect(cached).toEqual(refreshed);
    expect(refreshedAgain).toEqual(refreshed);
    expect(db.tables.dailyVerseCache).toHaveLength(1);
  });

  it("caches a fallback verse when the remote source fails", async () => {
    const db = createMemoryDb();
    const ctx = makeCtx(db);
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock as never);

    const refreshed = (await runAction(refreshDailyVerse, ctx, {
      now: new Date("2026-03-27T12:00:00.000Z").getTime(),
    })) as DailyVerseRecord;
    const cached = (await runQuery(getDailyVerse, ctx, {
      now: new Date("2026-03-27T12:00:00.000Z").getTime(),
    })) as DailyVerseRecord;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(refreshed).toMatchObject({
      source: "fallback",
      dateKey: "2026-03-27",
    });
    expect(cached).toEqual(refreshed);
    expect(db.tables.dailyVerseCache).toHaveLength(1);
  });
});
