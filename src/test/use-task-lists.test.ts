import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: vi.fn(() => ({ data: null, isLoading: false })),
    transact: vi.fn(),
    tx: new Proxy({}, { get: (_t, table) => new Proxy({}, { get: (_t2, rowId) => ({ update: vi.fn(), link: vi.fn(), delete: vi.fn() }) }) }),
  },
  id: vi.fn(() => 'mock-id'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => ({ activeCouple: null, user: null })),
}));

import { toListRows, type RawTaskListNode } from '@/src/hooks/useTaskLists';

const raw: RawTaskListNode[] = [
  {
    id: 'l1',
    name: 'Venice Trip',
    icon: 'mapPin',
    colorKey: 'peach',
    category: 'Travel',
    createdAt: 1,
    tasks: [
      { id: 't1', isCompleted: true },
      { id: 't2', isCompleted: false },
      { id: 't3', isCompleted: true },
    ],
  },
  {
    id: 'l2',
    name: 'Apartment',
    icon: null,
    colorKey: null,
    category: null,
    createdAt: 2,
    tasks: [],
  },
];

describe('toListRows', () => {
  it('aggregates done/total counts from nested tasks', () => {
    const rows = toListRows(raw);
    expect(rows[0]).toMatchObject({ id: 'l1', name: 'Venice Trip', done: 2, total: 3, colorKey: 'peach', icon: 'mapPin', category: 'Travel' });
  });
  it('falls back to default colorKey/icon when null', () => {
    const rows = toListRows(raw);
    expect(rows[1]).toMatchObject({ id: 'l2', name: 'Apartment', done: 0, total: 0, colorKey: 'peach', icon: 'shoppingBag', category: null });
  });
  it('preserves createdAt order as given', () => {
    const rows = toListRows(raw);
    expect(rows.map((r) => r.id)).toEqual(['l1', 'l2']);
  });
});
