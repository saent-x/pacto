import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Platform: { ...actual.Platform, OS: 'web' },
  };
});

vi.mock('expo-router/unstable-native-tabs', () => {
  const captured: string[] = [];
  function Trigger({ name, children }: { name: string; children?: React.ReactNode }) {
    captured.push(name);
    return children;
  }
  Trigger.Label = () => null;
  Trigger.Icon = () => null;
  function NativeTabs({ children }: { children?: React.ReactNode }) {
    captured.length = 0;
    return children;
  }
  (NativeTabs as any).Trigger = Trigger;
  (NativeTabs as any).__captured = captured;
  return { NativeTabs };
});

vi.mock('expo-router/js-tabs', () => {
  const screens: Array<{ name: string; options?: Record<string, unknown> }> = [];
  function Tabs({ children }: { children?: React.ReactNode }) {
    screens.length = 0;
    return children;
  }
  Tabs.Screen = (props: { name: string; options?: Record<string, unknown> }) => {
    screens.push(props);
    return null;
  };
  (Tabs as any).__screens = screens;
  return { Tabs, default: Tabs };
});

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({ C: { bg: '#fff', inkColor: '#111', ink2: '#777' } }),
}));
vi.mock('@/src/lib/session', () => ({ useSession: () => ({ isSolo: false }) }));
vi.mock('@/src/hooks/useFeatureGate', () => ({
  useFeatureGate: (id: string) => ({ enabled: true, id }),
}));

import { Tabs } from 'expo-router/js-tabs';
import * as nativeTabs from 'expo-router/unstable-native-tabs';
import TabsLayout from '@/app/(tabs)/_layout';

describe('bottom tabs layout on web', () => {
  it('uses JS tabs so direct auxiliary web routes are preserved', () => {
    renderToStaticMarkup(<TabsLayout />);

    expect((nativeTabs.NativeTabs as any).__captured).toEqual([]);
    expect((Tabs as any).__screens.map((screen: { name: string }) => screen.name)).toEqual([
      'home',
      'us',
      'memories',
      'calendar',
    ]);
  });

  it('keeps web tab image resize and tint out of style to avoid RN Web warnings', () => {
    renderToStaticMarkup(<TabsLayout />);

    const [homeScreen] = (Tabs as any).__screens;
    const icon = homeScreen.options.tabBarIcon({ color: '#123456' });
    const image = icon.type(icon.props);

    expect(image.props.resizeMode).toBe('contain');
    expect(image.props.tintColor).toBe('#123456');
    expect(image.props.style).not.toHaveProperty('resizeMode');
    expect(image.props.style).not.toHaveProperty('tintColor');
  });
});
