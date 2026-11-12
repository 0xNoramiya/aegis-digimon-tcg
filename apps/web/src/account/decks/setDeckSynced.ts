import { getSyncedDeckIds } from "@/account/decks/getSyncedDeckIds";
import { setSyncedDeckIds } from "@/account/decks/setSyncedDeckIds";

type Params = { accountId: string; deckId: string; synced: boolean };

export function setDeckSynced({ accountId, deckId, synced }: Params): void {
  const deckIds = getSyncedDeckIds({ accountId });
  if (synced) {
    deckIds.add(deckId);
  } else {
    deckIds.delete(deckId);
  }
  setSyncedDeckIds({ accountId, deckIds });
}
