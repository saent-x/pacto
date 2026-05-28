import React from 'react';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      accent: '#E4B24A',
      bone: '#F5EEE3',
      gold: '#D7A84A',
      ink3: '#9E8B78',
      inkColor: '#201713',
    },
    F: {
      bodyBold: 'GeistMono-Bold',
      displayBold: 'Pixel-Bold',
    },
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

import { HeaderBrand as PactoHeaderBrand } from '@/src/components/ui/pacto/HeaderBrand';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

function findTitleNode(tree: any, title: string) {
  return tree.root.findAllByType(Text).find((n: any) => {
    const children = n.props.children;
    return children === title || children?.[0] === title;
  });
}

function expectNoRenderedTrailingChild(titleNode: any) {
  const trailingChildren = Array.isArray(titleNode?.props.children)
    ? titleNode.props.children.slice(1)
    : [];
  expect(trailingChildren.every((child: any) => child == null || child === false)).toBe(true);
}

describe('HeaderBrand punctuation', () => {
  it('keeps pacto header titles with terminal punctuation from gaining an extra animated dot', () => {
    let tree: any;

    act(() => {
      tree = TestRenderer.create(<PactoHeaderBrand eyebrow="CHECK-IN" title="How are you?" />);
    });

    const title = findTitleNode(tree, 'How are you?');
    expect(title).toBeDefined();
    expectNoRenderedTrailingChild(title);
  });
});
