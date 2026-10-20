import type { storyCatalogDecks } from "#shared/story/storyCatalogDecks";

export type StoryCatalogBattle = {
  id: string;
  campaignId: string;
  chapter: string;
  title: string;
  protagonist?: string;
  opponents?: readonly string[];
  playerDeckRefs: readonly (keyof typeof storyCatalogDecks)[];
  opponentDeckRef: keyof typeof storyCatalogDecks;
  notes: string;
  sourceUrl: string;
  isOptional?: boolean;
  completionGroup?: string;
  canonicalOutcome: string;
};
