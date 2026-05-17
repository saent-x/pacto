export function memoryShareUrl(memoryId: string) {
  return `pacto://memories/${encodeURIComponent(memoryId)}`;
}
