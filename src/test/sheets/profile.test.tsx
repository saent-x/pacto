import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
  Stack: { Screen: () => null },
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(async () => true),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  const ReactActual: any = await vi.importActual('react');
  return {
    ...actual,
    Alert: { alert: alertSpy },
    Modal: ({ children, visible, ...props }: any) =>
      visible ? ReactActual.createElement(actual.View, props, children) : null,
  };
});

const themeState = vi.hoisted(() => ({
  mode: 'dark' as 'dark' | 'light',
  setMode: vi.fn((m: 'dark' | 'light') => {
    themeState.mode = m;
  }),
}));

vi.mock('@/src/lib/theme', async () => {
  const actual: any = await vi.importActual('@/src/lib/theme');
  return {
    ...actual,
    useTheme: () => ({
      ...actual.useTheme(),
      mode: themeState.mode,
      setMode: themeState.setMode,
    }),
  };
});

const sessionState = vi.hoisted(() => ({
  status: 'ready' as 'ready' | 'loading' | 'unauthed' | 'onboarding',
  user: {
    id: 'u1',
    email: 'mattia@coupl.app',
    displayName: 'Mattia',
    avatarUrl: null,
  } as any,
  space: {
    id: 's1',
    kind: 'pair' as 'pair' | 'solo' | 'crew',
    name: null,
    inviteCode: 'BREAD-SILK-42',
  } as any,
  mode: 'pair' as 'pair' | 'solo' | 'crew',
  enabledFeatures: ['tasks', 'calendar', 'goals'] as string[],
  membership: { id: 'm1', role: 'owner' } as any,
  soloMembership: { id: 'solo-m1', role: 'owner' } as any,
  sharedMembership: { id: 'm1', role: 'owner' } as any,
  personalSpaceId: 'solo-space',
  sharedSpaceId: 's1',
  partner: {
    id: 'u2',
    email: 'sofia@coupl.app',
    displayName: 'Sofia',
    avatarUrl: null,
  } as any,
  isSolo: false,
  isCouple: true,
}));

vi.mock('@/src/lib/session', () => ({
  useSession: () => sessionState,
}));

const dbSpy = vi.hoisted(() => ({
  signOut: vi.fn(async () => undefined),
}));
vi.mock('@/src/lib/db', () => ({
  db: { auth: { signOut: dbSpy.signOut } },
}));

const accountApiSpy = vi.hoisted(() => ({
  deleteAccountFromServer: vi.fn(async () => undefined),
}));
vi.mock('@/src/lib/account', () => accountApiSpy);

const notificationsSpy = vi.hoisted(() => ({
  unregisterPushTokenForUser: vi.fn(async () => undefined),
}));
vi.mock('@/src/lib/notifications', () => notificationsSpy);

const spaceActions = vi.hoisted(() => ({
  createSharedPactInvite: vi.fn(async () => 'PAIR-CODE-99'),
  leaveSpace: vi.fn(async () => undefined),
  regenerateInviteCode: vi.fn(async () => 'NEW-CODE-99'),
  updateUserAvatar: vi.fn(async () => undefined),
}));
vi.mock('@/src/lib/space-actions', () => spaceActions);

import ProfileSheet from '@/app/sheets/profile';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];

function readText(root: any) {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .map((n: any) => n.children.join(''));
}

describe('profile sheet', () => {
  beforeEach(() => {
    dbSpy.signOut.mockClear();
    notificationsSpy.unregisterPushTokenForUser.mockClear();
    spaceActions.createSharedPactInvite.mockClear();
    spaceActions.leaveSpace.mockClear();
    spaceActions.regenerateInviteCode.mockClear();
    spaceActions.updateUserAvatar.mockClear();
    accountApiSpy.deleteAccountFromServer.mockClear();
    themeState.setMode.mockClear();
    themeState.mode = 'dark';
    alertSpy.mockClear();
    routerSpy.back.mockClear();
    routerSpy.push.mockClear();
    routerSpy.replace.mockClear();
    sessionState.status = 'ready';
    sessionState.mode = 'pair';
    sessionState.isSolo = false;
    sessionState.isCouple = true;
    sessionState.partner = {
      id: 'u2',
      email: 'sofia@coupl.app',
      displayName: 'Sofia',
      avatarUrl: null,
    };
    sessionState.space = {
      id: 's1',
      kind: 'pair',
      name: null,
      inviteCode: 'BREAD-SILK-42',
    };
    sessionState.membership = { id: 'm1', role: 'owner' } as any;
    sessionState.soloMembership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.sharedMembership = { id: 'm1', role: 'owner' } as any;
    sessionState.personalSpaceId = 'solo-space';
    sessionState.sharedSpaceId = 's1';
    sessionState.enabledFeatures = ['tasks', 'calendar', 'goals'];
  });

  it('renders identity and settings without the features row', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    const labels = readText(renderer.root);
    expect(labels).toContain('Mattia');
    expect(labels).not.toContain('mattia@coupl.app');
    expect(findByTestID(renderer.root, 'profile-row-account')).toBeDefined();
    expect(findByTestID(renderer.root, 'profile-row-code')).toBeDefined();
    expect(findByTestID(renderer.root, 'profile-row-features')).toBeUndefined();
    expect(labels).not.toContain('Features');
    act(() => renderer.unmount());
  });

  it('solo session renders invite row and solo danger action', async () => {
    sessionState.mode = 'solo';
    sessionState.isSolo = true;
    sessionState.isCouple = false;
    sessionState.partner = null;
    sessionState.space = {
      id: 's1',
      kind: 'solo',
      name: null,
      inviteCode: null,
    };
    sessionState.membership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.soloMembership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.sharedMembership = null as any;
    sessionState.personalSpaceId = 's1';
    sessionState.sharedSpaceId = null as any;
    sessionState.enabledFeatures = ['tasks', 'calendar'];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    expect(findByTestID(renderer.root, 'profile-row-invite')).toBeDefined();
    expect(findByTestID(renderer.root, 'profile-row-join')).toBeDefined();
    expect(findByTestID(renderer.root, 'profile-signout')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('opens the join-code screen from a solo profile', async () => {
    sessionState.mode = 'solo';
    sessionState.isSolo = true;
    sessionState.isCouple = false;
    sessionState.partner = null;
    sessionState.space = {
      id: 's1',
      kind: 'solo',
      name: null,
      inviteCode: null,
    };
    sessionState.membership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.soloMembership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.sharedMembership = null as any;
    sessionState.personalSpaceId = 's1';
    sessionState.sharedSpaceId = null as any;

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-row-join').props.onPress();
      await flush();
    });

    expect(routerSpy.push).toHaveBeenCalledWith('/(auth)/invite');
    act(() => renderer.unmount());
  });

  it('creates a separate shared pact invite from a solo profile without mutating solo', async () => {
    sessionState.mode = 'solo';
    sessionState.isSolo = true;
    sessionState.isCouple = false;
    sessionState.partner = null;
    sessionState.space = {
      id: 'solo-space',
      kind: 'solo',
      name: null,
      inviteCode: null,
    };
    sessionState.membership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.soloMembership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.sharedMembership = null as any;
    sessionState.personalSpaceId = 'solo-space';
    sessionState.sharedSpaceId = null as any;

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      await findByTestID(renderer.root, 'profile-row-invite').props.onPress();
      await flush();
    });

    expect(spaceActions.createSharedPactInvite).toHaveBeenCalledWith({
      userId: 'u1',
      mode: 'pair',
    });
    expect(routerSpy.push).toHaveBeenCalledWith({
      pathname: '/(auth)/invite-code',
      params: { code: 'PAIR-CODE-99' },
    });
    act(() => renderer.unmount());
  });

  it('shows an alert and stays on profile when solo invite creation fails', async () => {
    sessionState.mode = 'solo';
    sessionState.isSolo = true;
    sessionState.isCouple = false;
    sessionState.partner = null;
    sessionState.space = {
      id: 'solo-space',
      kind: 'solo',
      name: null,
      inviteCode: null,
    };
    sessionState.membership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.soloMembership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.sharedMembership = null as any;
    sessionState.personalSpaceId = 'solo-space';
    sessionState.sharedSpaceId = null as any;
    spaceActions.createSharedPactInvite.mockRejectedValueOnce(new Error('offline'));

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    let caught: unknown;
    await act(async () => {
      try {
        await findByTestID(renderer.root, 'profile-row-invite').props.onPress();
      } catch (error) {
        caught = error;
      }
      await flush();
    });

    expect(caught).toBeUndefined();
    expect(alertSpy).toHaveBeenCalledWith('Invite failed', 'Try again.');
    expect(routerSpy.push).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('ignores duplicate invite taps while code generation is pending', async () => {
    sessionState.mode = 'solo';
    sessionState.isSolo = true;
    sessionState.isCouple = false;
    sessionState.partner = null;
    sessionState.space = {
      id: 'solo-space',
      kind: 'solo',
      name: null,
      inviteCode: null,
    };
    sessionState.membership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.soloMembership = { id: 'solo-m1', role: 'owner' } as any;
    sessionState.sharedMembership = null as any;
    sessionState.personalSpaceId = 'solo-space';
    sessionState.sharedSpaceId = null as any;
    let resolveInvite: (code: string) => void = () => undefined;
    const invitePromise = new Promise<string>((resolve) => {
      resolveInvite = resolve;
    });
    spaceActions.createSharedPactInvite.mockImplementationOnce(() => invitePromise);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    let firstPress: Promise<void> = Promise.resolve();
    let secondPress: Promise<void> = Promise.resolve();
    await act(async () => {
      const inviteRow = findByTestID(renderer.root, 'profile-row-invite');
      firstPress = inviteRow.props.onPress();
      secondPress = inviteRow.props.onPress();
      await flush();
    });

    expect(spaceActions.createSharedPactInvite).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveInvite('PAIR-CODE-99');
      await firstPress;
      await secondPress;
      await flush();
    });

    expect(routerSpy.push).toHaveBeenCalledTimes(1);
    expect(routerSpy.push).toHaveBeenCalledWith({
      pathname: '/(auth)/invite-code',
      params: { code: 'PAIR-CODE-99' },
    });
    act(() => renderer.unmount());
  });

  it('lets a paired pact generate an invite so a third member can join and promote it to crew', async () => {
    sessionState.space = {
      id: 'pair-space',
      kind: 'pair',
      name: null,
      inviteCode: null,
      memberCount: 2,
    };

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      await findByTestID(renderer.root, 'profile-row-code').props.onPress();
      await flush();
    });

    expect(spaceActions.regenerateInviteCode).toHaveBeenCalledWith({
      spaceId: 'pair-space',
      userId: 'u1',
      promoteToCrew: true,
    });
    expect(routerSpy.push).toHaveBeenCalledWith({
      pathname: '/(auth)/invite-code',
      params: { code: 'NEW-CODE-99' },
    });
    act(() => renderer.unmount());
  });

  it('regenerates stale pair invite codes with crew promotion before sharing them', async () => {
    sessionState.space = {
      id: 'pair-space',
      kind: 'pair',
      name: null,
      inviteCode: 'STALE1',
      memberCount: 2,
    };

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      await findByTestID(renderer.root, 'profile-row-code').props.onPress();
      await flush();
    });

    expect(spaceActions.regenerateInviteCode).toHaveBeenCalledWith({
      spaceId: 'pair-space',
      userId: 'u1',
      promoteToCrew: true,
    });
    expect(routerSpy.push).toHaveBeenCalledWith({
      pathname: '/(auth)/invite-code',
      params: { code: 'NEW-CODE-99' },
    });
    act(() => renderer.unmount());
  });

  it('sign-out unregisters this device before clearing auth', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-signout').props.onPress();
      await flush();
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, , buttons] = alertSpy.mock.calls[0];
    const destructive = buttons.find((b: any) => b.style === 'destructive');
    await act(async () => {
      await destructive.onPress();
      await flush();
    });
    expect(notificationsSpy.unregisterPushTokenForUser).toHaveBeenCalledWith('u1');
    expect(dbSpy.signOut).toHaveBeenCalledTimes(1);
    expect(notificationsSpy.unregisterPushTokenForUser.mock.invocationCallOrder[0]).toBeLessThan(
      dbSpy.signOut.mock.invocationCallOrder[0],
    );
    act(() => renderer.unmount());
  });

  it('sign-out still clears auth when push-token unregister fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    notificationsSpy.unregisterPushTokenForUser.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    try {
      await act(async () => {
        renderer = TestRenderer.create(<ProfileSheet />);
        await flush();
      });
      await act(async () => {
        findByTestID(renderer.root, 'profile-signout').props.onPress();
        await flush();
      });

      const [, , buttons] = alertSpy.mock.calls[0];
      const destructive = buttons.find((b: any) => b.style === 'destructive');
      let caught: unknown;
      await act(async () => {
        try {
          await destructive.onPress();
        } catch (error) {
          caught = error;
        }
        await flush();
      });

      expect(caught).toBeUndefined();
      expect(notificationsSpy.unregisterPushTokenForUser).toHaveBeenCalledWith('u1');
      expect(warnSpy).toHaveBeenCalledWith(
        '[profile] push-token unregister failed during sign-out',
        expect.any(Error),
      );
      expect(dbSpy.signOut).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
      if (renderer) act(() => renderer.unmount());
    }
  });

  it('requires typing IRREVERSIBLE before deleting the account', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account').props.onPress();
      await flush();
    });

    expect(findByTestID(renderer.root, 'profile-delete-account-modal')).toBeDefined();
    expect(findByTestID(renderer.root, 'profile-delete-account-confirm').props.disabled).toBe(true);

    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account-input').props.onChangeText('irreversible');
      await flush();
    });

    expect(findByTestID(renderer.root, 'profile-delete-account-confirm').props.disabled).toBe(false);

    await act(async () => {
      await findByTestID(renderer.root, 'profile-delete-account-confirm').props.onPress();
      await flush();
    });

    expect(accountApiSpy.deleteAccountFromServer).toHaveBeenCalledTimes(1);
    expect(dbSpy.signOut).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('sends account deletion context derived from session', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account-input').props.onChangeText('IRREVERSIBLE');
      await flush();
    });
    await act(async () => {
      await findByTestID(renderer.root, 'profile-delete-account-confirm').props.onPress();
      await flush();
    });

    expect(accountApiSpy.deleteAccountFromServer).toHaveBeenCalledWith({
      membershipId: 'm1',
      spaceId: 's1',
      isLastMember: undefined,
      personalMembershipId: 'solo-m1',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'm1',
      sharedSpaceId: 's1',
      sharedIsLastMember: undefined,
    });

    act(() => renderer.unmount());
  });

  it('deletes the account when paired and currently the last shared-member', async () => {
    sessionState.partner = null;
    sessionState.space = {
      id: 's1',
      kind: 'pair',
      name: null,
      inviteCode: null,
      memberCount: 1,
    } as any;

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account-input').props.onChangeText('IRREVERSIBLE');
      await flush();
    });
    await act(async () => {
      await findByTestID(renderer.root, 'profile-delete-account-confirm').props.onPress();
      await flush();
    });

    expect(spaceActions.createSharedPactInvite).not.toHaveBeenCalled();
    expect(accountApiSpy.deleteAccountFromServer).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('ignores duplicate account deletion confirmations while deletion is pending', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account-input').props.onChangeText('IRREVERSIBLE');
      await flush();
    });

    let firstPress: Promise<void> | undefined;
    let secondPress: Promise<void> | undefined;
    await act(async () => {
      const confirm = findByTestID(renderer.root, 'profile-delete-account-confirm');
      firstPress = confirm.props.onPress();
      secondPress = confirm.props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.all([firstPress, secondPress]);
      await flush();
    });
    expect(accountApiSpy.deleteAccountFromServer).toHaveBeenCalledTimes(1);
    expect(dbSpy.signOut).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('shows an error if account deletion from server fails', async () => {
    accountApiSpy.deleteAccountFromServer.mockRejectedValueOnce(new Error('delete blocked'));
    sessionState.partner = null;
    sessionState.space = {
      id: 's1',
      kind: 'pair',
      name: null,
      inviteCode: null,
      memberCount: 2,
    } as any;

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account-input').props.onChangeText('IRREVERSIBLE');
      await flush();
    });
    await act(async () => {
      await findByTestID(renderer.root, 'profile-delete-account-confirm').props.onPress();
      await flush();
    });

    expect(accountApiSpy.deleteAccountFromServer).toHaveBeenCalledTimes(1);
    expect(dbSpy.signOut).not.toHaveBeenCalled();

    const error = readText(renderer.root).find((line) => line.includes('Could not delete the account.'));
    expect(error).toBeDefined();
    act(() => renderer.unmount());
  });

  it('does not rely on client-side account cleanup for deletion', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-delete-account-input').props.onChangeText('IRREVERSIBLE');
      await flush();
    });
    await act(async () => {
      await findByTestID(renderer.root, 'profile-delete-account-confirm').props.onPress();
      await flush();
    });

    expect(accountApiSpy.deleteAccountFromServer).toHaveBeenCalledTimes(1);
    expect(spaceActions.leaveSpace).not.toHaveBeenCalled();
    expect(dbSpy.signOut).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('uses space member count when leaving if partner profile data is hidden', async () => {
    sessionState.partner = null;
    sessionState.space = {
      id: 's1',
      kind: 'pair',
      name: null,
      inviteCode: null,
      memberCount: 2,
    } as any;

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-leave').props.onPress();
      await flush();
    });

    const [, , buttons] = alertSpy.mock.calls[0];
    const destructive = buttons.find((b: any) => b.style === 'destructive');
    await act(async () => {
      await destructive.onPress();
      await flush();
    });

    expect(spaceActions.leaveSpace).toHaveBeenCalledWith({
      userId: 'u1',
      spaceId: 's1',
      membershipId: 'm1',
      isLastMember: false,
      remainingMemberCount: 1,
      personalSpaceId: 'solo-space',
    });
    act(() => renderer.unmount());
  });

  it('ignores duplicate leave confirmations while leave cleanup is pending', async () => {
    sessionState.partner = null;
    sessionState.space = {
      id: 's1',
      kind: 'pair',
      name: null,
      inviteCode: null,
      memberCount: 2,
    } as any;
    let resolveLeave: (() => void) | undefined;
    spaceActions.leaveSpace.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveLeave = resolve;
        }),
    );

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-leave').props.onPress();
      await flush();
    });

    const [, , buttons] = alertSpy.mock.calls[0];
    const destructive = buttons.find((b: any) => b.style === 'destructive');
    let firstPress: Promise<void> | undefined;
    let secondPress: Promise<void> | undefined;
    await act(async () => {
      firstPress = destructive.onPress();
      secondPress = destructive.onPress();
      await Promise.resolve();
    });

    expect(spaceActions.leaveSpace).toHaveBeenCalledTimes(1);
    resolveLeave?.();
    await act(async () => {
      await Promise.all([firstPress, secondPress]);
      await flush();
    });
    act(() => renderer.unmount());
  });

  it('shows an alert when leaving a pact fails', async () => {
    sessionState.partner = null;
    sessionState.space = {
      id: 's1',
      kind: 'pair',
      name: null,
      inviteCode: null,
      memberCount: 2,
    } as any;
    spaceActions.leaveSpace.mockRejectedValueOnce(new Error('permission denied'));

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-leave').props.onPress();
      await flush();
    });

    const [, , buttons] = alertSpy.mock.calls[0];
    const destructive = buttons.find((b: any) => b.style === 'destructive');
    let caught: unknown;
    await act(async () => {
      try {
        await destructive.onPress();
      } catch (error) {
        caught = error;
      }
      await flush();
    });

    expect(caught).toBeUndefined();
    expect(alertSpy).toHaveBeenLastCalledWith('Leave failed', 'Try again.');
    expect(spaceActions.leaveSpace).toHaveBeenCalledWith({
      userId: 'u1',
      spaceId: 's1',
      membershipId: 'm1',
      isLastMember: false,
      remainingMemberCount: 1,
      personalSpaceId: 'solo-space',
    });
    act(() => renderer.unmount());
  });

  it('theme pills call setMode', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-theme-light').props.onPress();
      await flush();
    });
    expect(themeState.setMode).toHaveBeenCalledWith('light');
    act(() => renderer.unmount());
  });

  it('unauthed status triggers router.replace to sign-in', async () => {
    sessionState.status = 'unauthed';
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    expect(routerSpy.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    act(() => renderer.unmount());
  });
});
