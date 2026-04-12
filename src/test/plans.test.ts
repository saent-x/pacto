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

describe('usePlans', () => {
  it('exports the usePlans hook as a function', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    expect(usePlans).toBeTypeOf('function');
  });
});
