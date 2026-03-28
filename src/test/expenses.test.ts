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

describe('useExpenses', () => {
  it('exports the useExpenses hook as a function', async () => {
    const { useExpenses } = await import('@/src/hooks/useExpenses');
    expect(useExpenses).toBeTypeOf('function');
  });

  it('module uses makeFunctionReference for Convex bindings', async () => {
    const { makeFunctionReference } = await import('convex/server');
    await import('@/src/hooks/useExpenses');
    expect(makeFunctionReference).toHaveBeenCalledWith('expenses:listExpenses');
    expect(makeFunctionReference).toHaveBeenCalledWith('expenses:createExpense');
    expect(makeFunctionReference).toHaveBeenCalledWith('expenses:updateExpense');
    expect(makeFunctionReference).toHaveBeenCalledWith('expenses:settleExpense');
    expect(makeFunctionReference).toHaveBeenCalledWith('expenses:deleteExpense');
  });
});
