import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

const { routerBack, iconSpy } = vi.hoisted(() => ({
  routerBack: vi.fn(),
  iconSpy: vi.fn(),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      accent: '#E4B24A',
      bg: '#161210',
      bgCard: '#211B18',
      inkColor: '#F5EEE3',
      lineColor: '#302821',
    },
    F: {},
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

vi.mock('expo-router', () => ({
  router: { back: routerBack },
}));

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: (props: any) => {
    iconSpy(props);
    return null;
  },
}));

import { SheetShell } from '@/src/components/ui/SheetShell';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('SheetShell', () => {
  it('renders eyebrow, title, children, and footer; close button calls router.back', () => {
    iconSpy.mockClear();
    routerBack.mockClear();

    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <SheetShell eyebrow="NEW" title="New task" footer={<Text>FOOTER</Text>}>
          <Text>BODY</Text>
        </SheetShell>,
      );
    });

    const texts = tree.root.findAllByType(Text);
    const eyebrow = texts.find((n: any) => n.props.children === 'NEW');
    expect(eyebrow?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#E4B24A' })]),
    );

    const title = texts.find((n: any) => n.props.children?.[0] === 'New task');
    expect(title?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontSize: 28, color: '#F5EEE3' }),
      ]),
    );

    const closeIcon = iconSpy.mock.calls.find((call) => call[0]?.name === 'x')?.[0];
    expect(closeIcon?.size).toBe(18);
    expect(closeIcon?.color).toBe('#F5EEE3');

    const closeButton = tree.root.findByType(Pressable);
    closeButton.props.onPress();
    expect(routerBack).toHaveBeenCalledTimes(1);

    const bodyTexts = tree.root.findAllByType(Text).map((n: any) =>
      Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? ''),
    );
    expect(bodyTexts).toContain('BODY');
    expect(bodyTexts).toContain('FOOTER');
  });

  it('omits eyebrow and title when not provided', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <SheetShell>
          <Text>BODY</Text>
        </SheetShell>,
      );
    });

    const bodyTexts = tree.root.findAllByType(Text).map((n: any) => n.props.children);
    expect(bodyTexts).toEqual(['BODY']);
  });

  it('honors custom eyebrowColor', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <SheetShell eyebrow="HOT" eyebrowColor="#FF00FF">
          <Text>BODY</Text>
        </SheetShell>,
      );
    });

    const eyebrow = tree.root.findAllByType(Text).find((n: any) => n.props.children === 'HOT');
    expect(eyebrow?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#FF00FF' })]),
    );
  });

  it('renders ScrollView as the native form sheet root', () => {
    let tree: any;

    act(() => {
      tree = TestRenderer.create(
        <SheetShell>
          <Text>BODY</Text>
        </SheetShell>,
      );
    });

    expect(tree.root.findByType(SheetShell).children[0].type).toBe(ScrollView);
  });
});
