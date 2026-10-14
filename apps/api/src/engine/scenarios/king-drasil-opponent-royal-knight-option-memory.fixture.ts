import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "king-drasil-opponent-royal-knight-option-memory",
  memory: 3,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      breeding: { card: "BT13-007", as: "kingDrasil", under: [{ card: "BT13-007", as: "inheritedKingDrasil" }] },
      battleArea: [{ card: "BT1-009", as: "attacker" }],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      deck: Array<string>(8).fill("BT1-009"),
      security: [{ card: "BT13-110", as: "royalPurge" }, "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
