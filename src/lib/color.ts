export function alphaColor(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const normalized =
    raw.length === 3
      ? raw
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : raw.slice(0, 6);

  if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const clamped = Math.max(0, Math.min(1, alpha));

  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}
