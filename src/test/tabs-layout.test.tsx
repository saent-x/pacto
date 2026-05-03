import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-router/unstable-native-tabs', () => {
  const captured: string[] = [];
  function Trigger({ name, children }: { name: string; children?: React.ReactNode }) {
    captured.push(name);
    return null;
  }
  Trigger.Label = ({ children }: any) => null;
  Trigger.Icon = () => null;
  function NativeTabs({ children }: any) {
    captured.length = 0;
    return children;
  }
  (NativeTabs as any).Trigger = Trigger;
  (NativeTabs as any).__captured = captured;
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
});
