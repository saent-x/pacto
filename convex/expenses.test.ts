import { describe, expect, it } from "vitest";

import { createCouple } from "./couples";
import { createExpense, updateExpense } from "./expenses";

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
    expenses: [],
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
        if (index !== -1) {
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

async function runMutation(fn: unknown, ctx: ReturnType<typeof makeCtx>, args: Record<string, unknown>) {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(ctx, args);
}

describe("expenses", () => {
  it("persists the selected payer and currency", async () => {
    const db = createMemoryDb();
    const ctx = makeCtx(
      {
        tokenIdentifier: "better-auth:user-1",
        subject: "user-1",
        issuer: "https://example.convex.site",
        email: "casey@example.com",
        name: "Casey",
      },
      db,
    );

    await runMutation(createCouple, ctx, { name: "Casey and Riley" });
    const memberships = db.tables.memberships;
    const partnerMembership = {
      ...memberships[0],
      _id: "memberships:partner",
      userId: "users:partner",
      role: "partner",
      status: "active",
    };
    memberships.push(partnerMembership);

    const expense = await runMutation(createExpense, ctx, {
      title: "Dinner",
      amount: 75,
      paidBy: "users:partner",
      currency: "GBP",
      splitType: "split",
      category: "Date night",
      date: "2026-04-09",
    });

    expect(expense).toMatchObject({
      paidBy: "users:partner",
      currency: "GBP",
    });
  });

  it("updates currency and payer", async () => {
    const db = createMemoryDb();
    const ctx = makeCtx(
      {
        tokenIdentifier: "better-auth:user-1",
        subject: "user-1",
        issuer: "https://example.convex.site",
        email: "casey@example.com",
        name: "Casey",
      },
      db,
    );

    await runMutation(createCouple, ctx, { name: "Casey and Riley" });
    const memberships = db.tables.memberships;
    memberships.push({
      ...memberships[0],
      _id: "memberships:partner",
      userId: "users:partner",
      role: "partner",
      status: "active",
    });

    const expense = await runMutation(createExpense, ctx, {
      title: "Flights",
      amount: 320,
      currency: "USD",
      splitType: "split",
      category: "Trip",
      date: "2026-04-10",
    });

    const updated = await runMutation(updateExpense, ctx, {
      expenseId: (expense as { _id: string })._id,
      paidBy: "users:partner",
      currency: "EUR",
    });

    expect(updated).toMatchObject({
      paidBy: "users:partner",
      currency: "EUR",
    });
  });
});
