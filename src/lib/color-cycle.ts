import { pickRandomUnusedValue } from './random-unused';
import { getTokens } from './tokens';

export const TARGET_COLOR_KEYS = ['sky', 'peach', 'butter', 'mint', 'rose', 'lavender', 'gold'] as const;
export const MILESTONE_COLOR_KEYS = ['rose', 'peach', 'butter', 'mint', 'sky', 'lavender', 'gold'] as const;

export type TargetColorKey = (typeof TARGET_COLOR_KEYS)[number];
export type MilestoneColorKey = (typeof MILESTONE_COLOR_KEYS)[number];
export type SheetColorKey = TargetColorKey | MilestoneColorKey | 'journal';

type TokenBag = Record<string, string>;
type ColorRecord = {
  color?: string | null;
  colorKey?: string | null;
};

function normalizeColor(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseHexColor(value: string): [number, number, number] | null {
  const raw = value.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function colorDistance(left: [number, number, number], right: [number, number, number]) {
  return (
    (left[0] - right[0]) ** 2 +
    (left[1] - right[1]) ** 2 +
    (left[2] - right[2]) ** 2
  );
}

export function colorValueForKey<K extends string>(tokens: TokenBag, key: K): string {
  return tokens[key] ?? '';
}

export function colorOptionsForKeys<K extends string>(
  tokens: TokenBag,
  keys: readonly K[],
): { key: K; value: string }[] {
  return keys.map((key) => ({ key, value: colorValueForKey(tokens, key) }));
}

export function resolveColorKey<K extends string>(
  record: ColorRecord | null | undefined,
  keys: readonly K[],
  tokens: TokenBag,
): K | null {
  const explicit = record?.colorKey;
  if (explicit && keys.includes(explicit as K)) return explicit as K;

  const color = normalizeColor(record?.color);
  if (!color) return null;

  const tokenSources: TokenBag[] = [tokens, getTokens('light'), getTokens('dark')];
  for (const source of tokenSources) {
    const match = keys.find((key) => normalizeColor(source[key]) === color);
    if (match) return match;
  }

  const rgb = parseHexColor(color);
  if (rgb) {
    let nearest: { key: K; distance: number } | null = null;
    for (const source of tokenSources) {
      for (const key of keys) {
        const candidate = parseHexColor(source[key] ?? '');
        if (!candidate) continue;
        const distance = colorDistance(rgb, candidate);
        if (!nearest || distance < nearest.distance) nearest = { key, distance };
      }
    }
    if (nearest) return nearest.key;
  }

  return null;
}

export function pickRandomUnusedColorKey<K extends string>(
  keys: readonly K[],
  records: readonly ColorRecord[],
  tokens: TokenBag,
  random?: () => number,
): K {
  const usedKeys = records
    .map((record) => resolveColorKey(record, keys, tokens))
    .filter((key): key is K => key != null);

  return pickRandomUnusedValue(keys, usedKeys, random);
}
