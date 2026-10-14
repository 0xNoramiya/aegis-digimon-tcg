import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "dna-digivolve-trigger-order-choice",
  memory: 6,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT1-003"],
      battleArea: [
        { card: "BT1-037", as: "blue" },
        { card: "BT1-073", as: "green" },
        { card: "BT16-085", as: "davisAndKen" },
      ],
      hand: [{ card: "BT16-025", as: "paildramon" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-020", as: "threeSources", under: ["BT1-001", "BT1-012", "BT1-014"] }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 5,
    },
  },
};

export default fixture;
