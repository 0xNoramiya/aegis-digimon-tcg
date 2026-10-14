import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "veemon-digivolve-bonus-draw",
  memory: 4,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT1-001"],
      battleArea: [{ card: "BT12-021", as: "veemon" }],
      hand: [{ card: "BT12-050", as: "stingmon" }],
      security: 5,
      deck: [{ card: "BT1-009", as: "turnDraw" }, { card: "BT12-047", as: "bonusDraw" }, ...Array(10).fill("BT1-009")],
    },
    1: {
      eggDeck: ["BT1-001"],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
  },
  presentation: { holdBotAfterTurn: 1 },
};

export default fixture;
