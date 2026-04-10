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

describe('usePlans', () => {
  it('exports the usePlans hook as a function', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    expect(usePlans).toBeTypeOf('function');
  });

  it('module uses makeFunctionReference for Convex bindings', async () => {
    const { makeFunctionReference } = await import('convex/server');
    await import('@/src/hooks/usePlans');
    expect(makeFunctionReference).toHaveBeenCalledWith('plans:listPlans');
    expect(makeFunctionReference).toHaveBeenCalledWith('plans:createPlan');
    expect(makeFunctionReference).toHaveBeenCalledWith('plans:updatePlan');
    expect(makeFunctionReference).toHaveBeenCalledWith('plans:deletePlan');
  });
});
