import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: vi.fn(() => ({ data: null, isLoading: false })),
    transact: vi.fn(),
  },
  id: vi.fn(() => 'mock-id'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => ({ activeCouple: null, user: null })),
}));

describe('useMilestones', () => {
  it('exports the useMilestones hook as a function', async () => {
    const { useMilestones } = await import('@/src/hooks/useMilestones');
    expect(useMilestones).toBeTypeOf('function');
  });
});
