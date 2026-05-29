import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const dbMock = vi.hoisted(() => ({
  storage: {
    uploadFile: vi.fn(async () => undefined),
  },
  queryOnce: vi.fn(async () => ({
    data: { $files: [{ url: 'https://cdn.pacto.test/upload.gif' }] },
  })),
}));

vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: vi.fn(async (uri: string, actions: any[], opts: any) => ({
    uri: 'compressed://x.jpg',
    width: 1080,
    height: 720,
  })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

vi.mock('expo-file-system', () => ({
  getInfoAsync: vi.fn(async () => ({ exists: true, size: 200_000 })),
  readAsStringAsync: vi.fn(async () => 'BASE64DATA'),
  EncodingType: { Base64: 'base64' },
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));

import { buildMemoryMediaPath, compressImage, useMediaUpload } from '@/src/hooks/memories/useMediaUpload';

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | undefined;
  function HookHost() {
    latest = useValue();
    return null;
  }
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(HookHost));
  });
  return {
    get latest() {
      return latest as T;
    },
    renderer: renderer!,
  };
}

describe('compressImage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    dbMock.storage.uploadFile.mockClear();
    dbMock.queryOnce.mockClear();
    dbMock.queryOnce.mockResolvedValue({
      data: { $files: [{ url: 'https://cdn.pacto.test/upload.gif' }] },
    });
  });

  it('resizes to MAX_IMAGE_DIM and reports size', async () => {
    const result = await compressImage('file://orig.jpg');
    expect(result.uri).toBe('compressed://x.jpg');
    expect(result.width).toBe(1080);
    expect(result.height).toBe(720);
    expect(result.bytes).toBe(200_000);
  });

  it('places media uploads under an owner-controlled space path', () => {
    expect(
      buildMemoryMediaPath({
        spaceId: 'space-1',
        userId: 'user-1',
        type: 'image',
        id: '01HQ',
      }),
    ).toBe('users/user-1/spaces/space-1/memories/01HQ.jpg');
    expect(
      buildMemoryMediaPath({
        spaceId: 'space-1',
        userId: 'user-1',
        type: 'gif',
        id: '01HR',
      }),
    ).toBe('users/user-1/spaces/space-1/memories/01HR.gif');
  });

  it('uses the uploaded GIF blob size when picker fileSize is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      blob: async () => new Blob(['gif-bytes'], { type: 'image/gif' }),
    })));
    const { latest, renderer } = await renderHookValue(() => useMediaUpload());

    const result = await latest.upload({
      spaceId: 'space-1',
      userId: 'user-1',
      type: 'gif',
      uri: 'file://animation.gif',
    });

    expect(result.mediaSize).toBe(9);
    expect(result.mediaUrl).toBe('https://cdn.pacto.test/upload.gif');
    expect(dbMock.storage.uploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/^users\/user-1\/spaces\/space-1\/memories\/.+\.gif$/),
      expect.any(File),
      { contentType: 'image/gif' },
    );
    act(() => renderer.unmount());
  });
});
