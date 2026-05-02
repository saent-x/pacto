import { describe, expect, it } from 'vitest';

import { Typography } from '@/src/constants/typography';

describe('Typography', () => {
  it('keeps standard screen titles and headings non-italic', () => {
    expect(Typography.largeTitle.fontStyle).toBeUndefined();
    expect(Typography.title.fontStyle).toBeUndefined();
    expect(Typography.heading.fontStyle).toBeUndefined();
  });

  it('keeps legacy editorial styles neutral under the current design system', () => {
    expect(Typography.editorial.fontStyle).toBeUndefined();
    expect(Typography.editorialLargeTitle.fontStyle).toBeUndefined();
  });
});
