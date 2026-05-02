import type { AiModelPack, AiModelPackStatus } from './types';

type ExpoFileSystem = typeof import('expo-file-system/legacy');

export type AiModelDownloadProgress = {
  packId: string;
  bytesWritten: number;
  totalBytes: number;
  progress: number;
};

export type AiModelStorageStatus = {
  pack: AiModelPack;
  localUri: string;
  status: AiModelPackStatus;
  sizeBytes: number;
};

const MODEL_DIR = 'ai-models';

export async function getAiModelLocalUri(pack: AiModelPack) {
  const fs = await getFileSystem();
  return `${fs.documentDirectory}${MODEL_DIR}/${pack.filename}`;
}

export async function getAiModelStorageStatus(pack: AiModelPack): Promise<AiModelStorageStatus> {
  const fs = await getFileSystem();
  const localUri = await getAiModelLocalUri(pack);
  const info = await fs.getInfoAsync(localUri);
  const sizeBytes = info.exists && typeof info.size === 'number' ? info.size : 0;
  return {
    pack,
    localUri,
    sizeBytes,
    status: info.exists && sizeBytes === pack.sizeBytes ? 'downloaded' : 'notDownloaded',
  };
}

export async function downloadAiModelPack(
  pack: AiModelPack,
  onProgress?: (progress: AiModelDownloadProgress) => void,
) {
  const fs = await getFileSystem();
  const directory = `${fs.documentDirectory}${MODEL_DIR}`;
  await fs.makeDirectoryAsync(directory, { intermediates: true });

  const localUri = await getAiModelLocalUri(pack);
  const download = fs.createDownloadResumable(
    pack.downloadUrl,
    localUri,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      const totalBytes = totalBytesExpectedToWrite || pack.sizeBytes;
      onProgress?.({
        packId: pack.id,
        bytesWritten: totalBytesWritten,
        totalBytes,
        progress: totalBytes > 0 ? totalBytesWritten / totalBytes : 0,
      });
    },
  );

  const result = await download.downloadAsync();
  if (!result?.uri) {
    throw new Error(`Failed to download ${pack.displayName}`);
  }
  return result.uri;
}

export async function deleteAiModelPack(pack: AiModelPack) {
  const fs = await getFileSystem();
  const localUri = await getAiModelLocalUri(pack);
  const info = await fs.getInfoAsync(localUri);
  if (info.exists) {
    await fs.deleteAsync(localUri, { idempotent: true });
  }
}

async function getFileSystem(): Promise<ExpoFileSystem> {
  const fs = await import('expo-file-system/legacy');
  if (!fs.documentDirectory) {
    throw new Error('Expo FileSystem documentDirectory is unavailable');
  }
  return fs;
}
