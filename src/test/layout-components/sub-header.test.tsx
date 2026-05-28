import React from 'react';
import { Pressable, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

const { iconSpy, routerBack, routerReplace, canGoBack } = vi.hoisted(() => ({
  iconSpy: vi.fn(),
  routerBack: vi.fn(),
  routerReplace: vi.fn(),
  canGoBack: vi.fn(() => true),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: { card: '#1D1815', bone: '#F5EEE3', fog: '#80746A' },
    F: { bodyBold: 'Geist_700Bold', displayBold: 'BitcountPropSingle_700Bold' },
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

vi.mock('expo-router', () => ({
  router: {
    back: routerBack,
    replace: routerReplace,
    canGoBack: () => canGoBack(),
  },
}));

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: (props: any) => {
    iconSpy(props);
    return null;
  },
}));

import { SubHeader } from '@/src/components/ui/SubHeader';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('SubHeader', () => {
  it('renders eyebrow, title, and right slot', () => {
    iconSpy.mockClear();
    let tree: any;

    act(() => {
      tree = TestRenderer.create(
        <SubHeader eyebrow="02 · WISHES" title="Wishlist" right={<Text>RIGHT</Text>} />,
      );
    });

    const texts = tree.root.findAllByType(Text).map((n: any) =>
      Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? ''),
    );
    expect(texts).toContain('02 · WISHES');
    expect(texts).toContain('Wishlist');
    expect(texts).toContain('RIGHT');

    const lastIcon = iconSpy.mock.calls.at(-1)?.[0];
    expect(lastIcon?.name).toBe('chevronLeft');
    expect(lastIcon?.color).toBe('#F5EEE3');
  });

  it('back button calls router.back when canGoBack is true', () => {
    routerBack.mockClear();
    routerReplace.mockClear();
    canGoBack.mockReturnValue(true);
    let tree: any;

    act(() => {
      tree = TestRenderer.create(<SubHeader eyebrow="X" title="Y" />);
    });

    const pressable = tree.root.findByType(Pressable);
    pressable.props.onPress();
    expect(routerBack).toHaveBeenCalledTimes(1);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('back button falls back to router.replace(/home) when canGoBack is false', () => {
    routerBack.mockClear();
    routerReplace.mockClear();
    canGoBack.mockReturnValue(false);
    let tree: any;

    act(() => {
      tree = TestRenderer.create(<SubHeader eyebrow="X" title="Y" />);
    });

    const pressable = tree.root.findByType(Pressable);
    pressable.props.onPress();
    expect(routerReplace).toHaveBeenCalledWith('/home');
    expect(routerBack).not.toHaveBeenCalled();
  });

  it('back button has scale-on-press feedback', () => {
    canGoBack.mockReturnValue(true);
    let tree: any;

    act(() => {
      tree = TestRenderer.create(<SubHeader eyebrow="X" title="Y" />);
    });

    const pressable = tree.root.findByType(Pressable);
    const pressed = pressable.props.style({ pressed: true });
    const arr = Array.isArray(pressed) ? pressed : [pressed];
    const entry = arr.find((s: any) => Array.isArray(s?.transform));
    expect(entry?.transform).toEqual([{ scale: 0.96 }]);
  });
});
