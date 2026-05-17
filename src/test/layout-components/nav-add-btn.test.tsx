import React from 'react';
import { Pressable } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

const { iconSpy, routerPush } = vi.hoisted(() => ({
  iconSpy: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: { inkColor: '#F5EEE3' },
    F: {},
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

vi.mock('expo-router', () => ({
  router: { push: routerPush },
}));

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: (props: any) => {
    iconSpy(props);
    return null;
  },
}));

import { NavAddBtn } from '@/src/components/ui/NavAddBtn';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('NavAddBtn', () => {
  it('routes to the href prop and renders the default plus icon', () => {
    iconSpy.mockClear();
    routerPush.mockClear();
    let tree: any;

    act(() => {
      tree = TestRenderer.create(<NavAddBtn href="/sheets/new-list" />);
    });

    const pressable = tree.root.findByType(Pressable);
    pressable.props.onPress();
    expect(routerPush).toHaveBeenCalledWith('/sheets/new-list');

    const lastIcon = iconSpy.mock.calls.at(-1)?.[0];
    expect(lastIcon?.name).toBe('plus');
    expect(lastIcon?.size).toBe(22);
    expect(lastIcon?.color).toBe('#F5EEE3');
    expect(lastIcon?.strokeWidth).toBe(2.4);
  });

  it('forwards a custom icon prop', () => {
    iconSpy.mockClear();

    act(() => {
      TestRenderer.create(<NavAddBtn href="/x" icon="heart" />);
    });

    const lastIcon = iconSpy.mock.calls.at(-1)?.[0];
    expect(lastIcon?.name).toBe('heart');
  });

  it('applies scale-on-press transform', () => {
    let tree: any;

    act(() => {
      tree = TestRenderer.create(<NavAddBtn href="/y" />);
    });

    const pressable = tree.root.findByType(Pressable);
    const pressedStyle = pressable.props.style({ pressed: true });
    const arr = Array.isArray(pressedStyle) ? pressedStyle : [pressedStyle];
    const transformEntry = arr.find((s: any) => Array.isArray(s?.transform));
    expect(transformEntry?.transform).toEqual([{ scale: 0.96 }]);
  });
});
