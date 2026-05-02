declare module 'whisper.rn/index.js' {
  export function initWhisper(options: { filePath: string | number; useGpu?: boolean }): Promise<{
    id?: number;
    gpu?: boolean;
    reasonNoGPU?: string;
    transcribe: (
      filePath: string,
      options?: { language?: string; maxThreads?: number },
    ) => {
      stop: () => void;
      promise: Promise<{ result: string; segments?: unknown[] }>;
    };
    release?: () => Promise<void> | void;
  }>;
}

declare module 'llama.rn' {
  export function initLlama(options: {
    model: string;
    n_ctx?: number;
    n_gpu_layers?: number;
  }): Promise<{
    completion: (options: {
      messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
      prompt?: string;
      response_format?: unknown;
      grammar?: string;
      n_predict?: number;
      temperature?: number;
    }) => Promise<{ text: string }>;
    release?: () => Promise<void> | void;
  }>;
}
