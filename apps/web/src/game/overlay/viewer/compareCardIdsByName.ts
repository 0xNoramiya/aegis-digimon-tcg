import { getCardDefinition } from "@aegis/shared";

export function compareCardIdsByName(first: string, second: string): number {
  return (
    (getCardDefinition(first)?.nameEn ?? first).localeCompare(getCardDefinition(second)?.nameEn ?? second) ||
    first.localeCompare(second)
  );
}
