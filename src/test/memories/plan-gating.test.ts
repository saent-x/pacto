import { describe, expect, it } from 'vitest';
import { canUse, planOf, PLAN_LIMITS } from '@/src/lib/plan';

describe('plan gating', () => {
  it('treats absent plan as free', () => {
    expect(planOf({} as any)).toBe('free');
    expect(planOf({ plan: undefined } as any)).toBe('free');
    expect(planOf({ plan: 'something-else' } as any)).toBe('free');
  });

  it('respects pro plan', () => {
    expect(planOf({ plan: 'pro' } as any)).toBe('pro');
  });

  it('free plan blocks video uploads', () => {
    expect(canUse({ plan: 'free' } as any, 'videoUploads')).toBe(false);
    expect(canUse({ plan: 'pro' } as any, 'videoUploads')).toBe(true);
  });

  it('exposes plan caps', () => {
    expect(PLAN_LIMITS.free.aiTurnsPerMonth).toBe(20);
    expect(PLAN_LIMITS.pro.aiTurnsPerMonth).toBe('unlimited');
    expect(PLAN_LIMITS.free.crewMaxMembers).toBe(4);
    expect(PLAN_LIMITS.pro.crewMaxMembers).toBe('unlimited');
  });
});
