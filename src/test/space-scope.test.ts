import { describe, expect, it } from 'vitest';
import { personalOrSharedSpaceId } from '@/src/lib/space-scope';

describe('personalOrSharedSpaceId', () => {
  it('does not route personal writes to a shared fallback when the personal space is missing', () => {
    expect(
      personalOrSharedSpaceId({
        isPrivate: true,
        personalSpaceId: null,
        sharedSpaceId: 'shared-1',
        fallbackSpaceId: 'shared-1',
      }),
    ).toBeNull();
  });

  it('keeps legacy solo fallback available when there is no separate shared space', () => {
    expect(
      personalOrSharedSpaceId({
        isPrivate: true,
        personalSpaceId: null,
        sharedSpaceId: null,
        fallbackSpaceId: 'solo-1',
      }),
    ).toBe('solo-1');
  });

  it('uses the shared space for shared writes before falling back to legacy active space', () => {
    expect(
      personalOrSharedSpaceId({
        isPrivate: false,
        personalSpaceId: 'solo-1',
        sharedSpaceId: 'shared-1',
        fallbackSpaceId: 'legacy-active',
      }),
    ).toBe('shared-1');
  });
});
