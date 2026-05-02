import type { AiModelPack } from './types';

export const AI_MODEL_PACKS: AiModelPack[] = [
  {
    id: 'whisper-tiny-en',
    type: 'speechToText',
    runtime: 'whisper.rn',
    displayName: 'Whisper tiny.en',
    filename: 'ggml-tiny.en.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    sizeBytes: 77_704_715,
    checksumSha256: '921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f',
    delivery: 'downloadAfterInstall',
    status: 'notDownloaded',
    recommended: true,
    notes: 'Fast English-first dictation baseline for mid-range iOS and Android devices.',
  },
  {
    id: 'whisper-base-en',
    type: 'speechToText',
    runtime: 'whisper.rn',
    displayName: 'Whisper base.en',
    filename: 'ggml-base.en.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    sizeBytes: 147_964_211,
    checksumSha256: 'a03779c86df3323075f5e796cb2ce5029f00ec8869eee3fdfb897afe36c6d002',
    delivery: 'downloadAfterInstall',
    status: 'notDownloaded',
    recommended: false,
    notes: 'Better transcription quality for devices with more memory and storage headroom.',
  },
  {
    id: 'qwen3-0.6b-instruct-q4',
    type: 'llm',
    runtime: 'llama.rn',
    displayName: 'Qwen3 0.6B Q4_K_M',
    filename: 'Qwen3-0.6B-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf',
    sizeBytes: 396_705_472,
    checksumSha256: 'ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a',
    delivery: 'downloadAfterInstall',
    status: 'notDownloaded',
    recommended: true,
    notes: 'Default lightweight local planning model for constrained JSON tool calls.',
  },
];

export function getAiModelPack(id: string) {
  return AI_MODEL_PACKS.find((pack) => pack.id === id) ?? null;
}

export function getRecommendedAiModelPacks() {
  return AI_MODEL_PACKS.filter((pack) => pack.recommended);
}
