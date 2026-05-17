import { describe, expect, it } from 'vitest';
import { memoryShareUrl } from '@/src/lib/share-links';

describe('share links', () => {
  it('uses the configured Pacto app scheme for memory links', () => {
    expect(memoryShareUrl('memory-1')).toBe('pacto://memories/memory-1');
  });

  it('encodes memory ids before placing them in deep links', () => {
    expect(memoryShareUrl('memory/id with spaces')).toBe('pacto://memories/memory%2Fid%20with%20spaces');
  });
});
