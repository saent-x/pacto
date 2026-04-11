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

describe('useExpenses', () => {
  it('exports the useExpenses hook as a function', async () => {
    const { useExpenses } = await import('@/src/hooks/useExpenses');
    expect(useExpenses).toBeTypeOf('function');
  });
});
