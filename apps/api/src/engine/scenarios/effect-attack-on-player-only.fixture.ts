import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "effect-attack-on-player-only",
  memory: 5,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT22-012", as: "rizeGreymon" }],
      hand: [{ card: "BT22-067", as: "lordKnightmon" }],
      deck: Array(12).fill("BT1-010"),
      security: 5,
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "suspendedDefender", suspended: true }],
      deck: Array(12).fill("BT1-010"),
      security: 3,
    },
  },
};

export default fixture;
