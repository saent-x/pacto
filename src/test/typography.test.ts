import { describe, expect, it } from 'vitest';

import { Typography } from '@/src/constants/typography';

describe('Typography', () => {
  it('keeps standard screen titles and headings non-italic', () => {
    expect(Typography.largeTitle.fontStyle).toBeUndefined();
    expect(Typography.title.fontStyle).toBeUndefined();
    expect(Typography.heading.fontStyle).toBeUndefined();
  });

  it('keeps editorial styles available for special accents only', () => {
    expect(Typography.editorial.fontStyle).toBe('italic');
    expect(Typography.editorialLargeTitle.fontStyle).toBe('italic');
  });
});
