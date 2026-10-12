export function printedPassage(text: string, passage: string): string | undefined {
  const words = passage
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return undefined;
  }
  const pattern = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  return new RegExp(pattern, "i").exec(text)?.[0];
}
