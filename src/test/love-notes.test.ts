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

vi.mock('@/src/hooks/useEncryption', () => ({
  useEncryption: vi.fn(() => ({
    encrypt: vi.fn(async (value: string) => value),
    decrypt: vi.fn(async (value: string) => value),
    hasKey: false,
  })),
}));

describe('useLoveNotes', () => {
  it('exports the useLoveNotes hook as a function', async () => {
    const { useLoveNotes } = await import('@/src/hooks/useLoveNotes');
    expect(useLoveNotes).toBeTypeOf('function');
  });
});
