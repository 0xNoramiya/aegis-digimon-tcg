import { splitPrintedClauses } from "@aegis/shared";

const SELF_DECK_TRASH = /When this card is trashed from (?:your|the) deck/i;

export function getSelfDeckTrashClause(box: string | undefined): string | undefined {
  if (box === undefined) {
    return undefined;
  }
  const start = box.search(SELF_DECK_TRASH);
  if (start < 0) {
    return undefined;
  }
  const rest = box.slice(start);
  const nextClause = splitPrintedClauses(rest)[0];
  const end = nextClause === undefined ? rest.length : rest.indexOf(nextClause.text);
  return rest.slice(0, end).trim();
}
