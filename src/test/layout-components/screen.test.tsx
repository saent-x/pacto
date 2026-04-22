import React from 'react';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: { statusBarHeight: 44 },
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: { ink: '#0E0B0A' },
    F: {},
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const ScrollViewTag = (props: any) => Reactx.createElement('AnimatedScrollView', props, props.children);
  ScrollViewTag.displayName = 'AnimatedScrollView';
  const ViewTag = (props: any) => Reactx.createElement('AnimatedView', props, props.children);
  ViewTag.displayName = 'AnimatedView';
  const fadeIn: any = { duration: () => fadeIn, delay: () => fadeIn };
  return {
    __esModule: true,
    default: { View: ViewTag, ScrollView: ScrollViewTag },
    FadeIn: fadeIn,
  };
});

import { Screen } from '@/src/components/ui/Screen';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

function findRoot(tree: any) {
  return tree.root.findAll((n: any) =>
    typeof n.type === 'function' &&
    (n.type.displayName === 'AnimatedScrollView' || n.type.displayName === 'AnimatedView'),
  )[0];
}

describe('Screen', () => {
  it('renders an Animated.ScrollView by default with entering + content padding', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <Screen>
          <Text>body</Text>
        </Screen>,
      );
    });

    const root = findRoot(tree);
    expect(root.type.displayName).toBe('AnimatedScrollView');
    expect(root.props.entering).toBeDefined();
    expect(root.props.showsVerticalScrollIndicator).toBe(false);
    expect(root.props.contentInsetAdjustmentBehavior).toBe('automatic');

    const contentStyle = root.props.contentContainerStyle;
    const flat = Array.isArray(contentStyle) ? contentStyle[0] : contentStyle;
    expect(flat).toMatchObject({
      paddingTop: 8,
      paddingHorizontal: 18,
      paddingBottom: 110,
    });
  });

  it('renders an Animated.View when scroll is false with safe-area top inset', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <Screen scroll={false} bottom={40}>
          <Text>body</Text>
        </Screen>,
      );
    });

    const root = findRoot(tree);
    expect(root.type.displayName).toBe('AnimatedView');
    expect(root.props.entering).toBeDefined();

    const style = root.props.style;
    const flat = Array.isArray(style) ? style[0] : style;
    expect(flat).toMatchObject({
      flex: 1,
      backgroundColor: '#0E0B0A',
      paddingTop: 47 + 8,
      paddingBottom: 40,
    });
  });

  it('uses STATUS_BAR height instead of safe area when underHeader is true', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <Screen scroll={false} underHeader>
          <Text>body</Text>
        </Screen>,
      );
    });

    const root = findRoot(tree);
    const flat = Array.isArray(root.props.style) ? root.props.style[0] : root.props.style;
    expect(flat).toMatchObject({
      paddingTop: 44 + 0,
    });
  });

  it('applies STATUS_BAR + topPad for underHeader scroll mode', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <Screen underHeader topPad={12}>
          <Text>body</Text>
        </Screen>,
      );
    });

    const root = findRoot(tree);
    const contentStyle = root.props.contentContainerStyle;
    const flat = Array.isArray(contentStyle) ? contentStyle[0] : contentStyle;
    expect(flat.paddingTop).toBe(44 + 12);
    expect(root.props.contentInsetAdjustmentBehavior).toBe('never');
    expect(root.props.automaticallyAdjustContentInsets).toBe(false);
  });

  it('merges custom style with defaults', () => {
    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <Screen style={{ backgroundColor: 'red' }}>
          <Text>body</Text>
        </Screen>,
      );
    });

    const root = findRoot(tree);
    const contentStyle = root.props.contentContainerStyle;
    expect(Array.isArray(contentStyle)).toBe(true);
    expect(contentStyle[1]).toMatchObject({ backgroundColor: 'red' });
  });
});
