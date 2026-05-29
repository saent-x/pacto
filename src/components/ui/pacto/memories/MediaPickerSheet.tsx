import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

export interface PickedAsset {
  uri: string;
  width: number;
  height: number;
  size?: number;
  mime?: string;
  isGif: boolean;
}

export function useMediaPicker() {
  const pick = useCallback(async (): Promise<PickedAsset | null> => {
    let permission: Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>;
    try {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    } catch (e) {
      console.warn('[media-picker] media permission request failed', e);
      return null;
    }
    if (!permission.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const a = result.assets[0];
    return {
      uri: a.uri,
      width: a.width,
      height: a.height,
      size: a.fileSize,
      mime: a.mimeType,
      isGif: (a.mimeType ?? '').includes('gif') || a.uri.toLowerCase().endsWith('.gif'),
    };
  }, []);

  return { pick };
}
