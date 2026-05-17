import { getAiModelStorageStatus } from './modelManager';
import { AI_MODEL_PACKS } from './modelRegistry';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export type PolishCompletionAdapter = {
  complete: (messages: Message[]) => Promise<string>;
  dispose?: () => Promise<void> | void;
};

export async function polishDraft(
  text: string,
  adapter?: PolishCompletionAdapter,
): Promise<string> {
  const draft = text.trim();
  if (!draft) return text;

  const completionAdapter = adapter ?? await createDefaultPolishAdapter();
  try {
    const result = await completionAdapter.complete([
      {
        role: 'system',
        content: [
          'Rewrite the memory post to be vivid, concise, and natural.',
          'Keep the original meaning and point of view.',
          'Do not add names, facts, hashtags, markdown, or quotation marks.',
          'Return only the rewritten post.',
        ].join(' '),
      },
      { role: 'user', content: draft },
    ]);

    const polished = sanitizePolishedText(result);
    return polished.length > 0 ? polished : text;
  } finally {
    if (!adapter) {
      await completionAdapter.dispose?.();
    }
  }
}

async function createDefaultPolishAdapter(): Promise<PolishCompletionAdapter> {
  const pack = AI_MODEL_PACKS.find((candidate) => candidate.id === 'qwen3-0.6b-instruct-q4');
  if (!pack) {
    throw new Error('Pacto AI model registry is incomplete.');
  }

  const status = await getAiModelStorageStatus(pack);
  if (status.status !== 'downloaded') {
    throw new Error('Download the local reasoning model before polishing memories.');
  }

  const { initLlama } = await import('llama.rn');
  const context = await initLlama({
    model: status.localUri,
    n_ctx: 2048,
    n_gpu_layers: 99,
  });

  return {
    async complete(messages) {
      const result = await context.completion({
        messages,
        n_predict: 180,
        temperature: 0.35,
      });
      return result.text;
    },
    dispose: () => context.release?.(),
  };
}

function sanitizePolishedText(text: string): string {
  return text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}
