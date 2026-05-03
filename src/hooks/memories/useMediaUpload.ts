import { useCallback } from 'react';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { ulid } from 'ulid';
import { db } from '@/src/lib/instant';
import {
  IMAGE_QUALITY,
  MAX_GIF_BYTES,
  MAX_IMAGE_DIM,
} from '@/src/lib/memories/quota';

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  bytes: number;
}

export async function compressImage(uri: string): Promise<CompressedImage> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIM } }],
    { compress: IMAGE_QUALITY, format: SaveFormat.JPEG },
  );
  const info = await FileSystem.getInfoAsync(result.uri);
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    bytes: info.exists && 'size' in info ? (info.size as number) : 0,
  };
}

export interface UploadParams {
  spaceId: string;
  type: 'image' | 'gif';
  uri: string;
  rawSize?: number;
}

export interface UploadResult {
  mediaUrl: string;
  mediaPath: string;
  mediaSize: number;
  mediaWidth?: number;
  mediaHeight?: number;
}

async function uploadAndGetUrl(
  path: string,
  uri: string,
  contentType: string,
): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const file = new File([blob], path.split('/').pop()!, { type: contentType });
  await (db as any).storage.uploadFile(path, file, { contentType });
  const result = await (db as any).queryOnce({
    $files: { $: { where: { path } } },
  });
  const url = result?.data?.$files?.[0]?.url as string | undefined;
  if (!url) throw new Error('upload succeeded but no URL returned');
  return url;
}

export function useMediaUpload() {
  const upload = useCallback(
    async ({
      spaceId,
      type,
      uri,
      rawSize,
    }: UploadParams): Promise<UploadResult> => {
      if (type === 'gif') {
        if (rawSize && rawSize > MAX_GIF_BYTES) {
          throw new Error(`GIF exceeds ${MAX_GIF_BYTES / 1024 / 1024}MB cap`);
        }
        const path = `spaces/${spaceId}/memories/${ulid()}.gif`;
        const mediaUrl = await uploadAndGetUrl(path, uri, 'image/gif');
        return {
          mediaUrl,
          mediaPath: path,
          mediaSize: rawSize ?? 0,
        };
      }
      const compressed = await compressImage(uri);
      const path = `spaces/${spaceId}/memories/${ulid()}.jpg`;
      const mediaUrl = await uploadAndGetUrl(
        path,
        compressed.uri,
        'image/jpeg',
      );
      return {
        mediaUrl,
        mediaPath: path,
        mediaSize: compressed.bytes,
        mediaWidth: compressed.width,
        mediaHeight: compressed.height,
      };
    },
    [],
  );

  return { upload };
}
