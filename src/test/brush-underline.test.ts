import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native-svg', () => ({
  default: () => null,
  Path: () => null,
}));

describe('BrushUnderline', () => {
  it('exports the component as a function', async () => {
    const { BrushUnderline } = await import('@/src/components/ui/BrushUnderline');
    expect(BrushUnderline).toBeTypeOf('function');
  });
});
