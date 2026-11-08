import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "inherited-end-turn-dna-enabled-by-pending-digivolve",
  memory: 3,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: { holdBotAfterTurn: 1, opponent: { endBreeding: true, fallbackMain: "end" } },
  board: {
    0: {
      battleArea: [
        { card: "EX13-070", as: "davis" },
        { card: "ST9-02", as: "veemon" },
        { card: "ST9-09", as: "stingmon", under: ["BT12-047"] },
      ],
      hand: [
        { card: "BT12-022", as: "exveemon" },
        { card: "BT16-025", as: "paildramon" },
      ],
      security: 5,
      deck: Array(16).fill("BT1-009"),
    },
    1: { security: 5, deck: Array(16).fill("BT1-009") },
  },
};

export default fixture;
