export function shouldAppendAccentDot(title: string) {
  return !/[.!?]$/.test(title.trim());
}
