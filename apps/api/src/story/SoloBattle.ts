import type { ScenarioFixture } from "#api/engine/scenario/types";

export type SoloBattle = {
  id: string;
  playerName?: string;
  deckName: string;
  opponentName: string;
  prerequisiteId?: string;
  fixture: ScenarioFixture;
  shuffleDecks: boolean;
};
