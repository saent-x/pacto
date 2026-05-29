import React from 'react';
import { StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    seekTo: vi.fn(),
    play: vi.fn(),
  }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    Avatar: () => null,
    AvatarPair: () => null,
    CrewStack: () => null,
    HeaderBrand: ({ title }: any) => Reactx.createElement('Text', null, title),
    PactoMark: () => null,
    Card: ({ children, onPress, testID, style }: any) =>
      onPress
        ? Reactx.createElement('Pressable', { onPress, testID, style }, children)
        : Reactx.createElement('View', { testID, style }, children),
  };
});

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: any) => {
    const Reactx = require('react');
    return Reactx.createElement('Text', null, name);
  },
}));

const sessionState = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    email: 'test@pacto.app',
    avatarUrl: null,
  } as any,
}));

vi.mock('@/src/lib/session', () => {
  return {
    useSession: () => sessionState,
  };
});

vi.mock('@/src/constants/defaultAvatars', async () => {
  const actual: any = await vi.importActual('@/src/constants/defaultAvatars');
  return {
    ...actual,
    randomDefaultAvatarId: () => 'avatar-1',
  };
});

const spaceActions = vi.hoisted(() => ({
  createSpace: vi.fn(async () => ({ spaceId: 'space-1', inviteCode: 'PAIR-CODE' })),
  ensureUserRow: vi.fn(async () => undefined),
}));

vi.mock('@/src/lib/space-actions', () => spaceActions);

import Onboarding from '@/app/(auth)/onboarding';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

const findByTestID = (root: any, id: string) =>
  root.findAll((node: any) => node.props?.testID === id)[0];

const flattenPressScaleStyle = (node: any) =>
  StyleSheet.flatten(
    typeof node.props.style === 'function'
      ? node.props.style({ pressed: false })
      : node.props.style,
  );

async function renderOnboarding() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<Onboarding />);
    await flush();
  });
  return renderer;
}

async function press(node: any) {
  await act(async () => {
    await node.props.onPress();
    await flush();
  });
}

describe('onboarding flow', () => {
  beforeEach(() => {
    routerSpy.push.mockClear();
    routerSpy.replace.mockClear();
    routerSpy.back.mockClear();
    sessionState.user = {
      id: 'user-1',
      email: 'test@pacto.app',
      avatarUrl: null,
    };
    spaceActions.createSpace.mockClear();
    spaceActions.ensureUserRow.mockClear();
    spaceActions.createSpace.mockResolvedValue({ spaceId: 'space-1', inviteCode: 'PAIR-CODE' });
  });

  it('creates a pair pact directly from mode selection without feature selection', async () => {
    const renderer = await renderOnboarding();

    await press(findByTestID(renderer.root, 'onboarding-mode-pair'));
    await press(findByTestID(renderer.root, 'onboarding-continue'));

    expect(spaceActions.ensureUserRow).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'test@pacto.app',
      avatarUrl: 'avatar-1',
    });
    expect(spaceActions.createSpace).toHaveBeenCalledWith({
      userId: 'user-1',
      kind: 'couple',
      mode: 'pair',
    });
    expect(spaceActions.createSpace.mock.calls[0][0]).not.toHaveProperty('enabledFeatures');
    expect(routerSpy.push).toHaveBeenCalledWith({
      pathname: '/(auth)/invite-code',
      params: { code: 'PAIR-CODE' },
    });
  });

  it('ignores duplicate continue presses while pair pact creation is pending', async () => {
    let resolveCreate: (value: { spaceId: string; inviteCode: string }) => void = () => undefined;
    const createPromise = new Promise<{ spaceId: string; inviteCode: string }>((resolve) => {
      resolveCreate = resolve;
    });
    spaceActions.createSpace.mockImplementation(() => createPromise);
    const renderer = await renderOnboarding();

    await press(findByTestID(renderer.root, 'onboarding-mode-pair'));

    let firstPress: Promise<void> | undefined;
    let secondPress: Promise<void> | undefined;
    await act(async () => {
      const continueButton = findByTestID(renderer.root, 'onboarding-continue');
      firstPress = continueButton.props.onPress();
      secondPress = continueButton.props.onPress();
      await flush();
    });

    expect(spaceActions.ensureUserRow).toHaveBeenCalledTimes(1);
    expect(spaceActions.createSpace).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({ spaceId: 'space-1', inviteCode: 'PAIR-CODE' });
      await firstPress;
      await secondPress;
      await flush();
    });

    expect(routerSpy.push).toHaveBeenCalledTimes(1);
    expect(routerSpy.push).toHaveBeenCalledWith({
      pathname: '/(auth)/invite-code',
      params: { code: 'PAIR-CODE' },
    });
  });

  it('uses the default base solo pact without creating a second solo space', async () => {
    spaceActions.createSpace.mockResolvedValue({ spaceId: 'space-1', inviteCode: null });
    const renderer = await renderOnboarding();

    await press(findByTestID(renderer.root, 'onboarding-mode-solo'));
    await press(findByTestID(renderer.root, 'onboarding-continue'));

    expect(spaceActions.ensureUserRow).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'test@pacto.app',
      avatarUrl: 'avatar-1',
    });
    expect(spaceActions.createSpace).not.toHaveBeenCalled();
    expect(routerSpy.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/(auth)/onboarding-features' }),
    );
  });

  it('redirects unauthenticated users to sign in before creating a pact', async () => {
    sessionState.user = null;
    const renderer = await renderOnboarding();

    await press(findByTestID(renderer.root, 'onboarding-mode-pair'));
    await press(findByTestID(renderer.root, 'onboarding-continue'));

    expect(routerSpy.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    expect(spaceActions.ensureUserRow).not.toHaveBeenCalled();
    expect(spaceActions.createSpace).not.toHaveBeenCalled();
  });

  it('renders onboarding continue action as a fully rounded pill', async () => {
    const renderer = await renderOnboarding();

    expect(flattenPressScaleStyle(findByTestID(renderer.root, 'onboarding-continue'))).toMatchObject({
      borderRadius: 999,
    });
  });
});
