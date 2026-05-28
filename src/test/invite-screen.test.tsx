import React from 'react';
import { Pressable, TextInput } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => routerSpy,
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    HeaderBrand: ({ eyebrow, title }: any) =>
      Reactx.createElement(
        'View',
        null,
        Reactx.createElement('Text', null, eyebrow),
        Reactx.createElement('Text', null, title),
      ),
    PactoMark: () => Reactx.createElement('View', { testID: 'pacto-mark' }),
  };
});

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: any) => {
    const Reactx = require('react');
    return Reactx.createElement('Text', null, name);
  },
}));

const sessionState = vi.hoisted(() => ({
  status: 'ready' as const,
  user: { id: 'user-1', email: 'test@coupl.app' } as any,
  isSolo: true,
  space: { id: 'solo-space' } as any,
  membership: { id: 'solo-membership' } as any,
}));

vi.mock('@/src/lib/session', () => ({
  useSession: () => sessionState,
}));

const spaceActions = vi.hoisted(() => ({
  ensureUserRow: vi.fn(async () => undefined),
  joinSpaceByCode: vi.fn(async () => undefined),
}));

vi.mock('@/src/lib/space-actions', () => spaceActions);

import Invite from '@/app/(auth)/invite';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function findContinue(root: any) {
  return root.findAllByType(Pressable).find((node: any) =>
    node.findAll((child: any) =>
      typeof child.children?.[0] === 'string' && child.children.join('') === 'Continue',
    ).length > 0,
  );
}

describe('invite join screen', () => {
  beforeEach(() => {
    routerSpy.back.mockClear();
    routerSpy.replace.mockClear();
    spaceActions.ensureUserRow.mockClear();
    spaceActions.joinSpaceByCode.mockClear();
    spaceActions.ensureUserRow.mockResolvedValue(undefined);
    spaceActions.joinSpaceByCode.mockResolvedValue(undefined);
  });

  it('ignores duplicate join submits while the first join is pending', async () => {
    let resolveJoin: () => void = () => undefined;
    const joinPromise = new Promise<void>((resolve) => {
      resolveJoin = resolve;
    });
    spaceActions.joinSpaceByCode.mockImplementation(() => joinPromise);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Invite />);
      await flush();
    });

    await act(async () => {
      renderer.root.findAllByType(TextInput)[0].props.onChangeText('ABCD23');
      await flush();
    });

    await act(async () => {
      const button = findContinue(renderer.root);
      button.props.onPress();
      button.props.onPress();
      await flush();
    });

    expect(spaceActions.ensureUserRow).toHaveBeenCalledTimes(1);
    expect(spaceActions.joinSpaceByCode).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveJoin();
      await flush();
    });

    expect(routerSpy.replace).toHaveBeenCalledTimes(1);
    expect(routerSpy.replace).toHaveBeenCalledWith('/(tabs)/home');

    act(() => renderer.unmount());
  });
});
