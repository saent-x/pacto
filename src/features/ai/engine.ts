import * as SecureStore from 'expo-secure-store';

export type Engine = 'whisper' | 'realtime';

const VALID = new Set<Engine>(['whisper', 'realtime']);
const DEFAULT_ENGINE: Engine = 'whisper';

const asEngine = (v: string | null | undefined): Engine | null =>
  v && VALID.has(v as Engine) ? (v as Engine) : null;

// Build-time inlined by Metro. MUST be referenced statically (no destructuring /
// bracket access) or it won't be replaced. Undefined when unset → fall back.
const ENV_ENGINE: Engine = asEngine(process.env.EXPO_PUBLIC_AI_ENGINE) ?? DEFAULT_ENGINE;

// The engine override only exists in development builds. In production the
// engine is fixed by EXPO_PUBLIC_AI_ENGINE.
const ENGINE_SWITCH_ENABLED = __DEV__;

const STORE_KEY = 'pacto.aiEngine';

/**
 * Production: always the env-configured engine.
 * Development: a persisted override wins, else the env default.
 */
export function resolveEngine(storedPref?: string | null): Engine {
  if (__DEV__) return asEngine(storedPref) ?? ENV_ENGINE;
  return ENV_ENGINE;
}

export async function loadEngine(): Promise<Engine> {
  if (!ENGINE_SWITCH_ENABLED) return ENV_ENGINE;
  try {
    return resolveEngine(await SecureStore.getItemAsync(STORE_KEY));
  } catch {
    return ENV_ENGINE;
  }
}
