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

describe('useMilestones', () => {
  it('exports the useMilestones hook as a function', async () => {
    const { useMilestones } = await import('@/src/hooks/useMilestones');
    expect(useMilestones).toBeTypeOf('function');
  });

  it('module uses makeFunctionReference for Convex bindings', async () => {
    const { makeFunctionReference } = await import('convex/server');
    await import('@/src/hooks/useMilestones');
    expect(makeFunctionReference).toHaveBeenCalledWith('milestones:listMilestones');
    expect(makeFunctionReference).toHaveBeenCalledWith('milestones:createMilestone');
    expect(makeFunctionReference).toHaveBeenCalledWith('milestones:updateMilestone');
    expect(makeFunctionReference).toHaveBeenCalledWith('milestones:deleteMilestone');
  });
});
