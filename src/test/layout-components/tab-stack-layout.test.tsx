import React from 'react';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

const { stackSpy, screenSpy, headerBrandSpy, headerLeftSpy } = vi.hoisted(() => ({
  stackSpy: vi.fn(),
  screenSpy: vi.fn(),
  headerBrandSpy: vi.fn(),
  headerLeftSpy: vi.fn(),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: { bone: '#F5EEE3', ink: '#0E0B0A' },
    F: {},
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

vi.mock('expo-router', () => {
  const Reactx = require('react');
  function Stack(props: any) {
    stackSpy(props);
    return Reactx.createElement(Reactx.Fragment, null, props.children);
  }
  Stack.Screen = function StackScreen(props: any) {
    screenSpy(props);
    return null;
  };
  return { Stack };
});

vi.mock('@/src/components/ui/HeaderBrand', () => ({
  HeaderBrand: (props: any) => {
    headerBrandSpy(props);
    return null;
  },
}));

vi.mock('@/src/components/ui/HeaderLeft', () => ({
  HeaderLeft: (props: any) => {
    headerLeftSpy(props);
    return null;
  },
}));

import { TabStackLayout } from '@/src/components/ui/TabStackLayout';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('TabStackLayout', () => {
  it('configures a transparent Stack and wires HeaderBrand + HeaderLeft via Stack.Screen options', () => {
    stackSpy.mockClear();
    screenSpy.mockClear();
    headerBrandSpy.mockClear();
    headerLeftSpy.mockClear();

    act(() => {
      TestRenderer.create(
        <TabStackLayout eyebrow="04 · TASKS" title="TASKS" accent="#7BA08A" />,
      );
    });

    const stackCall = stackSpy.mock.calls.at(-1)?.[0];
    expect(stackCall?.screenOptions).toMatchObject({
      headerShown: true,
      headerTransparent: true,
      headerShadowVisible: false,
      headerTintColor: '#F5EEE3',
      contentStyle: { backgroundColor: '#0E0B0A' },
    });
    expect(stackCall?.screenOptions?.headerBackground()).toBeNull();

    const screenCall = screenSpy.mock.calls.at(-1)?.[0];
    expect(screenCall?.name).toBe('index');
    expect(screenCall?.options?.title).toBe('');
    expect(screenCall?.options?.headerTitleAlign).toBe('center');
    expect(screenCall?.options?.headerStyle).toMatchObject({ backgroundColor: 'transparent' });

    // Invoke the header render fns to inspect what they mount.
    const titleNode = screenCall?.options?.headerTitle();
    const leftNode = screenCall?.options?.headerLeft();

    act(() => {
      TestRenderer.create(<>{titleNode}{leftNode}</>);
    });

    expect(headerBrandSpy).toHaveBeenCalledWith(
      expect.objectContaining({ eyebrow: '04 · TASKS', title: 'TASKS', accent: '#7BA08A' }),
    );
    expect(headerLeftSpy).toHaveBeenCalledWith(expect.objectContaining({ mode: 'back' }));
  });

  it('passes headerRight through untouched', () => {
    screenSpy.mockClear();
    const right = () => <Text>R</Text>;

    act(() => {
      TestRenderer.create(
        <TabStackLayout title="X" headerRight={right} />,
      );
    });

    const screenCall = screenSpy.mock.calls.at(-1)?.[0];
    expect(screenCall?.options?.headerRight).toBe(right);
  });
});
