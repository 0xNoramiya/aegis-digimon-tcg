import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "atomic-inferno-turn-expiry",
  memory: 5,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: { holdBotAfterTurn: 7, opponent: { endBreeding: true, fallbackMain: "end", blockerCard: "BT5-062" } },
  board: {
    0: {
      battleArea: [{ card: "BT4-016", as: "hybrid" }],
      hand: [{ card: "BT4-098", as: "option" }],
      security: 5,
      deck: Array(16).fill("BT1-009"),
    },
    1: {
      battleArea: [
        { card: "BT5-062", as: "firstBlocker" },
        { card: "BT5-062", as: "laterBlocker" },
      ],
      security: 5,
      deck: Array(16).fill("BT1-009"),
    },
  },
};

export default fixture;
