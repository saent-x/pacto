import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const paramsState = vi.hoisted(() => ({
  current: {} as Record<string, string | undefined>,
}));

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => paramsState.current,
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

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) => root.findAll((n: any) => n.props?.testID === id)[0];

import UpgradeSheet from '@/app/sheets/upgrade';
import * as RN from 'react-native';
import { router } from 'expo-router';

const supportEmail = 'support@pacto.app';

describe('upgrade sheet', () => {
  beforeEach(() => {
    paramsState.current = {};
    (router.back as any).mockClear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders upgrade content and actions', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<UpgradeSheet />);
      await flush();
    });

    const requestBtn = findByTestID(renderer.root, 'upgrade-request-pro');
    const closeBtn = findByTestID(renderer.root, 'upgrade-close');
    expect(requestBtn).toBeDefined();
    expect(closeBtn).toBeDefined();

    const hasRequestText = renderer.root.findAll((n: any) => (n.props?.children ?? '') === 'Request Pro access').length > 0;
    expect(hasRequestText).toBe(true);
    act(() => renderer.unmount());
  });

  it('opens a prefilled support email and closes when available', async () => {
    const alertSpy = vi.spyOn(RN.Alert, 'alert').mockImplementation(() => undefined);
    const canOpenSpy = vi.spyOn(RN.Linking, 'canOpenURL').mockResolvedValue(true);
    const openSpy = vi.spyOn(RN.Linking, 'openURL').mockResolvedValue(undefined as unknown as boolean);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<UpgradeSheet />);
      await flush();
    });

    const requestBtn = findByTestID(renderer.root, 'upgrade-request-pro');
    await act(async () => {
      requestBtn.props.onPress();
      await flush();
    });

    const expectedMailto = expect.stringContaining(`mailto:${supportEmail}`);
    expect(canOpenSpy).toHaveBeenCalledWith(expectedMailto);
    expect(openSpy).toHaveBeenCalledWith(expectedMailto);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });

  it('shows fallback alert when email cannot be opened', async () => {
    const alertSpy = vi.spyOn(RN.Alert, 'alert').mockImplementation(() => undefined);
    vi.spyOn(RN.Linking, 'canOpenURL').mockResolvedValue(false);
    const openSpy = vi.spyOn(RN.Linking, 'openURL').mockResolvedValue(undefined as unknown as boolean);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<UpgradeSheet />);
      await flush();
    });

    const requestBtn = findByTestID(renderer.root, 'upgrade-request-pro');
    await act(async () => {
      requestBtn.props.onPress();
      await flush();
    });

    expect(alertSpy).toHaveBeenCalledWith('Could not open email', `Contact ${supportEmail} to request Pro access.`);
    expect(openSpy).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('closes when Not now is tapped', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<UpgradeSheet />);
      await flush();
    });

    const closeBtn = findByTestID(renderer.root, 'upgrade-close');
    await act(async () => {
      closeBtn.props.onPress();
      await flush();
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
