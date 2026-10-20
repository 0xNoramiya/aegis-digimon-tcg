import type { ScenarioFixture } from "#api/engine/scenario/types";
import type { StoryCatalogDeck } from "@aegis/shared/story/StoryCatalogDeck";
import { catalogStoryBattles } from "@aegis/shared/story/catalogStoryBattles";
import { getStoryScenarioDeck } from "#api/story/getStoryScenarioDeck";

type Params = { battleId: string };

function createSeat(deck: Pick<StoryCatalogDeck, "main" | "eggs">) {
  const cards = deck.main.flatMap(([card, count]) => Array.from({ length: count }, () => card));
  return {
    hand: cards.slice(0, 5),
    security: cards.slice(5, 10),
    deck: cards.slice(10),
    eggDeck: deck.eggs.flatMap(([card, count]) => Array.from({ length: count }, () => card)),
    battleArea: [],
  };
}

export function getCatalogStoryScenario({ battleId }: Params): ScenarioFixture | undefined {
  const battle = catalogStoryBattles.find((entry) => entry.id === battleId);
  if (!battle?.opponentDeckRef || !battle.playerDeckRef) {
    return undefined;
  }
  return {
    name: battle.id,
    memory: 0,
    turnSeat: 0,
    turnCount: 0,
    isFirstPlayersFirstTurn: true,
    presentation: { timed: false },
    board: {
      0: createSeat(getStoryScenarioDeck({ ref: battle.playerDeckRef })),
      1: createSeat(getStoryScenarioDeck({ ref: battle.opponentDeckRef })),
    },
  };
}
