import React from 'react';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({
  useRouter: () => routerSpy,
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const imagePickerMock = vi.hoisted(() => ({
  requestMediaLibraryPermissionsAsync: vi.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: vi.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///tmp/avatar.png', mimeType: 'image/png' }],
  })),
  MediaTypeOptions: { Images: 'Images' },
}));

vi.mock('expo-image-picker', () => imagePickerMock);

const sessionState = vi.hoisted(() => ({
  status: 'ready',
  user: {
    id: 'user-1',
    email: 'user@pacto.app',
    displayName: 'Alex',
    avatarUrl: null,
  },
  partner: null,
  space: { id: 'solo-1', kind: 'solo', name: null },
}));

vi.mock('@/src/lib/session', () => ({
  useSession: () => sessionState,
}));

const spaceActions = vi.hoisted(() => ({
  deleteUploadedAvatar: vi.fn(async () => undefined),
  updateUserAvatar: vi.fn(async () => undefined),
  updateUserProfile: vi.fn(async () => undefined),
  uploadAvatarFromUri: vi.fn(async () => ({
    avatarUrl: 'https://cdn.pacto.test/avatar.png',
    avatarPath: 'avatars/user-1/avatar.png',
  })),
}));

vi.mock('@/src/lib/space-actions', () => spaceActions);

import AccountSheet from '@/app/sheets/account';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];

describe('account sheet', () => {
  beforeEach(() => {
    routerSpy.replace.mockClear();
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockClear();
    imagePickerMock.launchImageLibraryAsync.mockClear();
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    imagePickerMock.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/avatar.png', mimeType: 'image/png' }],
    });
    spaceActions.deleteUploadedAvatar.mockClear();
    spaceActions.updateUserAvatar.mockClear();
    spaceActions.updateUserAvatar.mockResolvedValue(undefined);
    spaceActions.updateUserProfile.mockClear();
    spaceActions.uploadAvatarFromUri.mockClear();
    sessionState.status = 'ready';
  });

  it('persists uploaded custom avatars with their storage path', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<AccountSheet />);
      await flush();
    });

    await act(async () => {
      await findByTestID(renderer.root, 'account-avatar-upload').props.onPress();
      await flush();
    });

    expect(spaceActions.uploadAvatarFromUri).toHaveBeenCalledWith({
      userId: 'user-1',
      uri: 'file:///tmp/avatar.png',
      contentType: 'image/png',
    });
    expect(spaceActions.updateUserAvatar).toHaveBeenCalledWith({
      userId: 'user-1',
      avatarUrl: 'https://cdn.pacto.test/avatar.png',
      avatarPath: 'avatars/user-1/avatar.png',
    });
    act(() => renderer.unmount());
  });

  it('ignores duplicate default-avatar taps while the avatar update is pending', async () => {
    let resolveAvatar: () => void = () => undefined;
    const avatarPromise = new Promise<void>((resolve) => {
      resolveAvatar = resolve;
    });
    spaceActions.updateUserAvatar.mockImplementation(() => avatarPromise);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<AccountSheet />);
      await flush();
    });

    await act(async () => {
      const avatar = findByTestID(renderer.root, 'account-avatar-pacto:avatar-1');
      avatar.props.onPress();
      avatar.props.onPress();
      await flush();
    });

    expect(spaceActions.updateUserAvatar).toHaveBeenCalledTimes(1);
    expect(spaceActions.updateUserAvatar).toHaveBeenCalledWith({
      userId: 'user-1',
      avatarUrl: 'pacto:avatar-1',
    });

    await act(async () => {
      resolveAvatar();
      await flush();
    });
    act(() => renderer.unmount());
  });

  it('ignores duplicate display-name saves while the profile update is pending', async () => {
    let resolveUpdate: () => void = () => undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    spaceActions.updateUserProfile.mockImplementation(() => updatePromise);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<AccountSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'account-display-name-input').props.onChangeText('Alex New');
      await flush();
    });
    await act(async () => {
      const save = findByTestID(renderer.root, 'account-save-display-name');
      save.props.onPress();
      save.props.onPress();
      await flush();
    });

    expect(spaceActions.updateUserProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
      await flush();
    });

    expect(spaceActions.updateUserProfile).toHaveBeenCalledWith({
      userId: 'user-1',
      displayName: 'Alex New',
    });
    act(() => renderer.unmount());
  });

  it('deletes a newly uploaded avatar file if the profile update fails', async () => {
    spaceActions.updateUserAvatar.mockRejectedValueOnce(new Error('offline'));

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<AccountSheet />);
      await flush();
    });

    await act(async () => {
      await findByTestID(renderer.root, 'account-avatar-upload').props.onPress();
      await flush();
    });

    expect(spaceActions.deleteUploadedAvatar).toHaveBeenCalledWith({
      userId: 'user-1',
      avatarPath: 'avatars/user-1/avatar.png',
    });
    act(() => renderer.unmount());
  });

  it('does not open the avatar picker when photo permission is denied', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<AccountSheet />);
      await flush();
    });

    try {
      await act(async () => {
        await findByTestID(renderer.root, 'account-avatar-upload').props.onPress();
        await flush();
      });

      expect(imagePickerMock.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(spaceActions.uploadAvatarFromUri).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Permission needed',
        'Allow photo access to choose a custom avatar.',
      );
    } finally {
      alertSpy.mockRestore();
    }

    act(() => renderer.unmount());
  });

  it('handles avatar picker bridge failures without escaping the sheet', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pickerError = new Error('image picker unavailable');
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockRejectedValueOnce(pickerError);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<AccountSheet />);
      await flush();
    });

    try {
      await act(async () => {
        await findByTestID(renderer.root, 'account-avatar-upload').props.onPress();
        await flush();
      });

      expect(imagePickerMock.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(spaceActions.uploadAvatarFromUri).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[account] avatar picker failed', pickerError);
      expect(alertSpy).toHaveBeenCalledWith(
        'Photo picker failed',
        'Could not open your photos. Try again.',
      );
    } finally {
      alertSpy.mockRestore();
      warnSpy.mockRestore();
    }

    act(() => renderer.unmount());
  });
});
