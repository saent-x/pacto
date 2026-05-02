import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/hooks/useJournal', () => ({
  useJournal: () => ({ create: vi.fn(async () => undefined) }),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    isSolo: false,
    partner: { id: 'partner-1', displayName: 'Sam' },
    isFeatureEnabled: () => true,
  }),
}));

import NewEntry from '@/app/sheets/new-entry';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function hasText(root: any, text: string) {
  return root.findAll((node: any) => node.children?.includes?.(text)).length > 0;
}

function findByTestID(root: any, id: string) {
  return root.findAll((node: any) => node.props?.testID === id)[0];
}

describe('new-entry sheet header', () => {
  it('renders the current SheetShell header and entry inputs', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewEntry />);
      await flush();
    });

    expect(hasText(renderer.root, format(new Date(), 'EEEE, MMMM d').toUpperCase())).toBe(true);
    expect(hasText(renderer.root, 'New entry')).toBe(true);
    expect(findByTestID(renderer.root, 'new-entry-title-input')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-entry-body-input')).toBeDefined();

    act(() => renderer.unmount());
  });
});
