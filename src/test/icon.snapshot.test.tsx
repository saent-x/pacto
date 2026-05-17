import React from 'react';
import { describe, expect, it } from 'vitest';

import { Icon, type IconName } from '@/src/components/ui/Icon';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

function render(el: React.ReactElement) {
  let tree: any;
  act(() => {
    tree = TestRenderer.create(el);
  });
  return tree.toJSON();
}

// Representative sample — covers navigation, status, object, directional icons.
const SAMPLE: IconName[] = [
  'bell',
  'heart',
  'check',
  'chevronRight',
  'x',
  'plus',
  'home',
  'user',
];

describe('Icon snapshots', () => {
  for (const name of SAMPLE) {
    it(`${name} — default`, () => {
      expect(render(<Icon name={name} />)).toMatchSnapshot();
    });

    it(`${name} — color=#ff0`, () => {
      expect(render(<Icon name={name} color="#ff0" />)).toMatchSnapshot();
    });

    it(`${name} — strokeWidth=3`, () => {
      expect(render(<Icon name={name} strokeWidth={3} />)).toMatchSnapshot();
    });
  }

  it('renders null for unknown name gracefully (type-bypass)', () => {
    // Force through the switch's default branch (returns null).
    const Unknown = 'nonexistent' as unknown as IconName;
    expect(render(<Icon name={Unknown} />)).toMatchSnapshot();
  });

  it('respects size prop', () => {
    expect(render(<Icon name="bell" size={48} />)).toMatchSnapshot();
  });
});
