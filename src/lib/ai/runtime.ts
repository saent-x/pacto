import type { AiToolCall } from './types';
import { parseAiToolCall } from './tools';

export type AiTranscriptionAdapter = {
  transcribeFile: (audioUri: string) => Promise<string>;
  dispose?: () => Promise<void> | void;
};

export type AiPlanningAdapter = {
  plan: (messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) => Promise<AiToolCall[]>;
  dispose?: () => Promise<void> | void;
};

export async function createWhisperRnAdapter(modelUri: string): Promise<AiTranscriptionAdapter> {
  const { initWhisper } = await import('whisper.rn/index.js');
  const context = await initWhisper({ filePath: modelUri });

  return {
    async transcribeFile(audioUri: string) {
      const { promise } = context.transcribe(audioUri, { language: 'en' });
      const { result } = await promise;
      return result.trim();
    },
    dispose: () => context.release?.(),
  };
}

export async function createLlamaRnPlanningAdapter(modelUri: string): Promise<AiPlanningAdapter> {
  const { initLlama } = await import('llama.rn');
  const context = await initLlama({
    model: modelUri,
    n_ctx: 4096,
    n_gpu_layers: 99,
  });

  return {
    async plan(messages) {
      const result = await context.completion({
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            strict: true,
            schema: {
              type: 'object',
              properties: {
                toolCalls: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      domain: { type: 'string' },
                      operation: { type: 'string' },
                      targetId: { type: 'string' },
                      input: { type: 'object' },
                      confidence: { type: 'number' },
                    },
                    required: ['domain', 'operation', 'input'],
                  },
                },
              },
              required: ['toolCalls'],
            },
          },
        },
        n_predict: 512,
        temperature: 0.2,
      });
      // SEC-8: The model's raw text is untrusted. Wrap JSON.parse so malformed
      // output throws a clear, catchable error instead of a bare SyntaxError.
      // The parsed tool calls are NOT trusted past this point: every call is
      // re-validated by `parseAiToolCall` (which allowlists `domain`/`operation`
      // via a Zod enum), then `buildMutationPlan` re-checks the target's space
      // ownership against server-derived context maps before any dispatch.
      let parsed: { toolCalls?: unknown };
      try {
        parsed = JSON.parse(result.text) as { toolCalls?: unknown };
      } catch {
        throw new Error('Pacto AI returned malformed planner output.');
      }
      const toolCalls = Array.isArray(parsed?.toolCalls) ? parsed.toolCalls : [];
      return toolCalls.map(parseAiToolCall);
    },
    dispose: () => context.release?.(),
  };
}
