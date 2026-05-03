import { describe, expect, it } from 'vitest';
import { useMemory } from '@/src/hooks/memories/useMemory';

describe('useMemory query shape', () => {
  it('orders replies by createdAt asc', () => {
    const src = useMemory.toString();
    expect(src).toMatch(/order:\s*\{\s*createdAt:\s*['"]asc['"]/);
  });
});
