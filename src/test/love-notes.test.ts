import { describe, expect, it, vi } from 'vitest';

vi.mock('convex/server', () => ({
  makeFunctionReference: vi.fn((name: string) => name),
}));

vi.mock('convex/react', () => ({
  useConvex: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => ({ activeCouple: null })),
}));

describe('useLoveNotes', () => {
  it('exports the useLoveNotes hook as a function', async () => {
    const { useLoveNotes } = await import('@/src/hooks/useLoveNotes');
    expect(useLoveNotes).toBeTypeOf('function');
  });

  it('module uses makeFunctionReference for Convex bindings', async () => {
    const { makeFunctionReference } = await import('convex/server');
    await import('@/src/hooks/useLoveNotes');
    expect(makeFunctionReference).toHaveBeenCalledWith('loveNotes:listLoveNotes');
    expect(makeFunctionReference).toHaveBeenCalledWith('loveNotes:createLoveNote');
    expect(makeFunctionReference).toHaveBeenCalledWith('loveNotes:updateLoveNote');
    expect(makeFunctionReference).toHaveBeenCalledWith('loveNotes:deleteLoveNote');
  });
});
