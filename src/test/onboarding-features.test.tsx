import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
  Stack: { Screen: () => null },
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
    email: 'test@coupl.app',
    avatarUrl: null,
  } as any,
}));

vi.mock('@/src/lib/session', () => {
  return {
    useSession: () => sessionState,
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

const findAllByTestID = (root: any, id: string) =>
  root.findAll((node: any) => node.props?.testID === id);

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

describe('onboarding feature selection', () => {
  beforeEach(() => {
    routerSpy.push.mockClear();
    routerSpy.replace.mockClear();
    routerSpy.back.mockClear();
    sessionState.user = {
      id: 'user-1',
      email: 'test@coupl.app',
      avatarUrl: null,
    };
    spaceActions.createSpace.mockClear();
    spaceActions.ensureUserRow.mockClear();
    spaceActions.createSpace.mockResolvedValue({ spaceId: 'space-1', inviteCode: 'PAIR-CODE' });
  });

  it('pair mode initializes defaults and persists selected feature ids after toggling a default off', async () => {
    const renderer = await renderOnboarding();

    await press(findByTestID(renderer.root, 'onboarding-mode-pair'));
    expect(spaceActions.createSpace).not.toHaveBeenCalled();

    await press(findByTestID(renderer.root, 'feature-toggle-checkins'));
    await press(findByTestID(renderer.root, 'onboarding-create-space'));

    expect(spaceActions.createSpace).toHaveBeenCalledWith({
      userId: 'user-1',
      kind: 'couple',
      mode: 'pair',
      enabledFeatures: ['tasks', 'calendar', 'wishlist', 'memories', 'journal', 'recurring'],
    });
  });

  it('crew mode passes crew mode and includes crew defaults without unsupported features', async () => {
    const renderer = await renderOnboarding();

    await press(findByTestID(renderer.root, 'onboarding-mode-crew'));
    await press(findByTestID(renderer.root, 'onboarding-create-space'));

    expect(spaceActions.createSpace).toHaveBeenCalledWith({
      userId: 'user-1',
      kind: 'couple',
      mode: 'crew',
      enabledFeatures: [
        'tasks',
        'calendar',
        'wishlist',
        'memories',
        'recurring',
        'timetable',
        'goals',
      ],
    });
  });

  it('does not render unsupported features for crew', async () => {
    const renderer = await renderOnboarding();

    await press(findByTestID(renderer.root, 'onboarding-mode-crew'));

    expect(findAllByTestID(renderer.root, 'feature-toggle-journal')).toHaveLength(0);
    expect(findAllByTestID(renderer.root, 'feature-toggle-checkins')).toHaveLength(0);
  });

  it('redirects unauthenticated users to sign in before creating a space', async () => {
    sessionState.user = null;
    const renderer = await renderOnboarding();

    await press(findByTestID(renderer.root, 'onboarding-mode-pair'));
    await press(findByTestID(renderer.root, 'onboarding-create-space'));

    expect(routerSpy.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    expect(spaceActions.ensureUserRow).not.toHaveBeenCalled();
    expect(spaceActions.createSpace).not.toHaveBeenCalled();
  });
});
