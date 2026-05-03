import { describe, expect, it, vi } from 'vitest';

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

import { compressImage } from '@/src/hooks/memories/useMediaUpload';

describe('compressImage', () => {
  it('resizes to MAX_IMAGE_DIM and reports size', async () => {
    const result = await compressImage('file://orig.jpg');
    expect(result.uri).toBe('compressed://x.jpg');
    expect(result.width).toBe(1080);
    expect(result.height).toBe(720);
    expect(result.bytes).toBe(200_000);
  });
});
