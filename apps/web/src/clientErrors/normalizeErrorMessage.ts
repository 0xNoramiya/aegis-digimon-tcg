const MAX_NORMALIZED_MESSAGE = 200;

export function normalizeErrorMessage(message: string): string {
  return message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>")
    .replace(/\b0x[0-9a-f]+\b/gi, "<n>")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NORMALIZED_MESSAGE);
}
