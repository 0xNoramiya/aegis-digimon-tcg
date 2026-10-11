import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "training-hand-effects-independent",
  memory: 4,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      hand: [
        { card: "BT22-013", as: "war", faceUp: false },
        { card: "BT22-026", as: "metal", faceUp: false },
      ],
      battleArea: [
        { card: "LM-057", as: "training", top: { card: "LM-057", as: "training-card" } },
        { card: "BT22-084", as: "nokia" },
        { card: "BT22-008", as: "agumon", top: { card: "BT22-008", as: "agumon-card" } },
        { card: "BT22-017", as: "gabumon", top: { card: "BT22-017", as: "gabumon-card" } },
      ],
      deck: Array.from({ length: 12 }, (_, index) => ({ card: "BT1-010", as: `own-draw-${index}` })),
      security: 3,
    },
    1: {
      deck: Array.from({ length: 12 }, (_, index) => ({ card: "BT1-010", as: `opponent-draw-${index}` })),
      security: 3,
    },
  },
};

export default fixture;
