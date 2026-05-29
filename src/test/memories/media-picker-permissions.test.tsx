import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const imagePickerMock = vi.hoisted(() => ({
  requestMediaLibraryPermissionsAsync: vi.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: vi.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: 'file:///tmp/memory.jpg',
        width: 1200,
        height: 900,
        fileSize: 1024,
        mimeType: 'image/jpeg',
      },
    ],
  })),
  MediaTypeOptions: { Images: 'Images' },
}));

vi.mock('expo-image-picker', () => imagePickerMock);

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | null = null;

  function Probe() {
    latest = useValue();
    return null;
  }

  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
    await flush();
  });

  return { latest: latest!, renderer };
}

describe('useMediaPicker permissions', () => {
  beforeEach(() => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockClear();
    imagePickerMock.launchImageLibraryAsync.mockClear();
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    imagePickerMock.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/memory.jpg',
          width: 1200,
          height: 900,
          fileSize: 1024,
          mimeType: 'image/jpeg',
        },
      ],
    });
  });

  it('does not open the image library when media permission is denied', async () => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const { useMediaPicker } = await import('@/src/components/ui/pacto/memories/MediaPickerSheet');
    const { latest, renderer } = await renderHookValue(() => useMediaPicker());

    const asset = await latest.pick();

    expect(asset).toBeNull();
    expect(imagePickerMock.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(imagePickerMock.launchImageLibraryAsync).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('maps a picked image asset after permission is granted', async () => {
    const { useMediaPicker } = await import('@/src/components/ui/pacto/memories/MediaPickerSheet');
    const { latest, renderer } = await renderHookValue(() => useMediaPicker());

    const asset = await latest.pick();

    expect(imagePickerMock.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(imagePickerMock.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: 'Images',
      quality: 0.8,
      exif: false,
    });
    expect(asset).toEqual({
      uri: 'file:///tmp/memory.jpg',
      width: 1200,
      height: 900,
      size: 1024,
      mime: 'image/jpeg',
      isGif: false,
    });

    act(() => renderer.unmount());
  });

  it('returns null when the media permission bridge fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const permissionError = new Error('media permission unavailable');
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockRejectedValueOnce(permissionError);
    const { useMediaPicker } = await import('@/src/components/ui/pacto/memories/MediaPickerSheet');
    const { latest, renderer } = await renderHookValue(() => useMediaPicker());

    try {
      const asset = await latest.pick();

      expect(asset).toBeNull();
      expect(imagePickerMock.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[media-picker] media permission request failed',
        permissionError,
      );
    } finally {
      warnSpy.mockRestore();
    }

    act(() => renderer.unmount());
  });
});
