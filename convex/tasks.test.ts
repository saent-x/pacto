import { describe, expect, it } from "vitest";

import { createCouple } from "./couples";
import {
  createTask,
  createTaskList,
  deleteTask,
  getTaskBoard,
  toggleTask,
  updateTask,
} from "./tasks";

type Identity = {
  tokenIdentifier: string;
  subject: string;
  issuer: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
};

type TaskListResult = {
  _id: string;
  coupleId: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdBy: string;
  createdAt: number;
};

type TaskResult = {
  _id: string;
  listId: string;
  coupleId: string;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  completedAt: number | null;
  completedBy: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  priority: number;
  sortOrder: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

type TaskBoardResult = {
  lists: TaskListResult[];
  tasks: TaskResult[];
};

function createMemoryDb() {
  const tables: Record<string, Array<Record<string, unknown> & { _id: string }>> = {
    users: [],
    couples: [],
    memberships: [],
    taskLists: [],
    tasks: [],
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
      for (const [tableName, rows] of Object.entries(tables)) {
        const index = rows.findIndex((doc) => doc._id === id);
        if (index !== -1) {
          tables[tableName] = [...rows.slice(0, index), ...rows.slice(index + 1)];
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

async function runQuery(fn: unknown, ctx: ReturnType<typeof makeCtx>, args: Record<string, unknown> = {}) {
  return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(ctx, args);
}

describe("tasks", () => {
  it("creates lists and tasks for the active couple", async () => {
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
    const list = (await runMutation(createTaskList, ctx, { name: "General", icon: "list" })) as TaskListResult;
    const task = (await runMutation(createTask, ctx, {
      listId: list._id,
      title: "Buy flowers",
      dueDate: "2026-03-26",
      priority: 2,
    })) as TaskResult;

    expect(list).toMatchObject({
      name: "General",
      icon: "list",
    });
    expect(task).toMatchObject({
      listId: list._id,
      title: "Buy flowers",
      dueDate: "2026-03-26",
      priority: 2,
      isCompleted: false,
    });

    const board = (await runQuery(getTaskBoard, ctx)) as TaskBoardResult;
    expect(board.lists).toHaveLength(1);
    expect(board.tasks).toHaveLength(1);
    expect(board.tasks[0].title).toBe("Buy flowers");
  });

  it("updates, toggles, and deletes tasks without uuid assumptions", async () => {
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
    const list = (await runMutation(createTaskList, ctx, { name: "General" })) as TaskListResult;
    const task = (await runMutation(createTask, ctx, {
      listId: list._id,
      title: "Buy flowers",
    })) as TaskResult;

    const updated = (await runMutation(updateTask, ctx, {
      taskId: task._id,
      title: "Buy flowers and candles",
      dueDate: "2026-03-27",
    })) as TaskResult;
    expect(updated).toMatchObject({
      title: "Buy flowers and candles",
      dueDate: "2026-03-27",
    });

    const toggled = (await runMutation(toggleTask, ctx, { taskId: task._id })) as TaskResult;
    expect(toggled.isCompleted).toBe(true);
    expect(toggled.completedBy).toMatch(/^users:/);

    await runMutation(deleteTask, ctx, { taskId: task._id });
    const board = (await runQuery(getTaskBoard, ctx)) as TaskBoardResult;
    expect(board.tasks).toHaveLength(0);
  });

  it("reassigns sort order when moving a task to a different list", async () => {
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
    const homeList = (await runMutation(createTaskList, ctx, { name: "Home" })) as TaskListResult;
    const travelList = (await runMutation(createTaskList, ctx, { name: "Travel" })) as TaskListResult;

    const movedTask = (await runMutation(createTask, ctx, {
      listId: homeList._id,
      title: "Book hotel",
    })) as TaskResult;

    await runMutation(createTask, ctx, {
      listId: travelList._id,
      title: "Renew passport",
    });

    const updated = (await runMutation(updateTask, ctx, {
      taskId: movedTask._id,
      listId: travelList._id,
    })) as TaskResult;

    expect(updated.listId).toBe(travelList._id);
    expect(updated.sortOrder).toBe(1);
  });
});
