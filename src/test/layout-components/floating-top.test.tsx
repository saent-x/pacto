import React from 'react';
import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: { statusBarHeight: 44 },
}));

import { FloatingTop } from '@/src/components/ui/FloatingTop';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('FloatingTop', () => {
  it('positions absolutely at top-right with pass-through hit testing', () => {
    let tree: any;

    act(() => {
      tree = TestRenderer.create(
        <FloatingTop>
          <View testID="child" />
        </FloatingTop>,
      );
    });

    const root = tree.root.findAllByType(View)[0];
    expect(root.props.style).toMatchObject({
      position: 'absolute',
      top: 44 + 6,
      right: 16,
      zIndex: 10,
      pointerEvents: 'box-none',
    });

    expect(tree.root.findByProps({ testID: 'child' })).toBeTruthy();
  });
});
