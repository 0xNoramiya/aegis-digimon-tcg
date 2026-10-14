import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "mother-no-play-cost",
  memory: 10,
  turnSeat: 1,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: {
    holdBotAfterTurn: 5,
    opponent: { endBreeding: true, main: [{ kind: "play", card: "LM-043" }] },
  },
  board: {
    0: {
      battleArea: [
        { card: "EX2-007", as: "mother" },
        { card: "BT1-010", as: "lowestCost" },
      ],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
    1: {
      hand: [{ card: "LM-043", as: "darkdramon" }],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
  },
};

export default fixture;
