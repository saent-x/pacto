import React from 'react';
import { Text, View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: { ink: '#0E0B0A' },
    F: { displayBold: 'BricolageGrotesque_800ExtraBold' },
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

vi.mock('@/src/lib/timetables-data', () => ({}));

import { WhoDot } from '@/src/components/ui/WhoDot';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

function letters(tree: any): string[] {
  return tree.root.findAllByType(Text).map((n: any) =>
    Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? ''),
  );
}

describe('WhoDot', () => {
  it('renders a single peach bubble with the current user initial', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(<WhoDot who={'me' as any} meInitial="A" />);
    });
    expect(letters(tree)).toEqual(['A']);

    const bubble = tree.root.findAllByType(View)[0];
    expect(bubble.props.style).toMatchObject({
      backgroundColor: '#F4A68C',
      width: 18,
      height: 18,
      borderRadius: 9,
    });
  });

  it('renders a single lavender bubble with the partner initial', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(<WhoDot who={'partner' as any} partnerInitial="R" />);
    });
    expect(letters(tree)).toEqual(['R']);

    const bubble = tree.root.findAllByType(View)[0];
    expect(bubble.props.style).toMatchObject({
      backgroundColor: '#B8A8E8',
    });
  });

  it('renders two overlapping bubbles for both, second with negative margin and border', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(<WhoDot who={'both' as any} meInitial="A" partnerInitial="R" />);
    });
    expect(letters(tree)).toEqual(['A', 'R']);

    const views = tree.root.findAllByType(View);
    const [row, first, second] = views;
    expect(row.props.style).toMatchObject({ flexDirection: 'row' });
    expect(first.props.style).toMatchObject({ marginLeft: 0, borderWidth: 0 });
    expect(second.props.style).toMatchObject({
      marginLeft: -5,
      borderWidth: 1.5,
      borderColor: '#0E0B0A',
    });
  });

  it('honors size and borderColor props', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <WhoDot who={'both' as any} size={28} borderColor="#FF0000" />,
      );
    });
    const views = tree.root.findAllByType(View);
    const [, first, second] = views;
    expect(first.props.style).toMatchObject({ width: 28, height: 28, borderRadius: 14 });
    expect(second.props.style).toMatchObject({ borderColor: '#FF0000' });
  });
});
