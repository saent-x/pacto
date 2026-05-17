import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-router/unstable-native-tabs', () => {
  const captured: string[] = [];
  const icons: Record<string, unknown> = {};
  function Trigger({ name, children }: { name: string; children?: React.ReactNode }) {
    captured.push(name);
    (Trigger as any).__current = name;
    return children;
  }
  Trigger.Label = ({ children }: any) => null;
  Trigger.Icon = ({ src }: any) => {
    icons[(Trigger as any).__current] = src;
    return null;
  };
  function NativeTabs({ children }: any) {
    captured.length = 0;
    for (const key of Object.keys(icons)) delete icons[key];
    return children;
  }
  (NativeTabs as any).Trigger = Trigger;
  (NativeTabs as any).__captured = captured;
  (NativeTabs as any).__icons = icons;
  return { NativeTabs };
});

vi.mock('@/src/lib/theme', () => ({ useTheme: () => ({ C: { inkColor: '#000' } }) }));
vi.mock('@/src/lib/session', () => ({ useSession: () => ({ isSolo: false }) }));
vi.mock('@/src/hooks/useFeatureGate', () => ({
  useFeatureGate: (id: string) => ({ enabled: true, id }),
}));

import { renderToStaticMarkup } from 'react-dom/server';
import * as nativeTabs from 'expo-router/unstable-native-tabs';
import TabsLayout from '@/app/(tabs)/_layout';

describe('bottom tabs layout', () => {
  it('contains exactly home, us, memories, calendar', () => {
    renderToStaticMarkup(<TabsLayout />);
    const captured: string[] = (nativeTabs.NativeTabs as any).__captured;
    expect(captured).toEqual(['home', 'us', 'memories', 'calendar']);
  });

  it('omits the legacy tasks and reminders triggers', () => {
    renderToStaticMarkup(<TabsLayout />);
    const captured: string[] = (nativeTabs.NativeTabs as any).__captured;
    expect(captured).not.toContain('tasks');
    expect(captured).not.toContain('reminders');
  });

  it('uses a dedicated memories tab asset', () => {
    renderToStaticMarkup(<TabsLayout />);
    const icons: Record<string, unknown> = (nativeTabs.NativeTabs as any).__icons;
    expect(String(icons.memories)).toContain('tab-memories');
  });
});
