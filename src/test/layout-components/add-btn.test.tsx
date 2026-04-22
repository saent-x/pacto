import React from 'react';
import { Pressable } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

const { iconSpy } = vi.hoisted(() => ({ iconSpy: vi.fn() }));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: { gold: '#E4B24A', peachInk: '#3A1F14' },
    F: {},
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: (props: any) => {
    iconSpy(props);
    return null;
  },
}));

import { AddBtn } from '@/src/components/ui/AddBtn';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('AddBtn', () => {
  it('invokes onPress and renders a plus icon on the gold fill', () => {
    iconSpy.mockClear();
    const onPress = vi.fn();
    let tree: any;

    act(() => {
      tree = TestRenderer.create(<AddBtn onPress={onPress} />);
    });

    const pressable = tree.root.findByType(Pressable);
    pressable.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);

    const baseStyle = pressable.props.style({ pressed: false });
    const flat = Array.isArray(baseStyle) ? baseStyle[0] : baseStyle;
    expect(flat).toMatchObject({
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#E4B24A',
    });

    const lastIcon = iconSpy.mock.calls.at(-1)?.[0];
    expect(lastIcon?.name).toBe('plus');
    expect(lastIcon?.color).toBe('#3A1F14');
    expect(lastIcon?.strokeWidth).toBe(2.5);
  });

  it('applies scale-on-press via PressScale', () => {
    let tree: any;

    act(() => {
      tree = TestRenderer.create(<AddBtn />);
    });

    const pressable = tree.root.findByType(Pressable);
    const pressedStyle = pressable.props.style({ pressed: true });
    const arr = Array.isArray(pressedStyle) ? pressedStyle : [pressedStyle];
    const transformEntry = arr.find((s: any) => Array.isArray(s?.transform));
    expect(transformEntry?.transform).toEqual([{ scale: 0.96 }]);
  });
});
