import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "homeros-end-turn-cost",
  memory: 3,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: { holdBotAfterTurn: 7, opponent: { endBreeding: true, fallbackMain: "end" } },
  board: {
    0: {
      battleArea: [
        { card: "BT24-102", as: "homeros" },
        { card: "BT24-040", as: "base" },
      ],
      hand: [{ card: "BT26-103", as: "wrath" }],
      security: 5,
      deck: Array(16).fill("BT1-009"),
    },
    1: { security: 5, deck: Array(16).fill("BT1-009") },
  },
};

export default fixture;
