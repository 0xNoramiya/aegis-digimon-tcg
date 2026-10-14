import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "nightmare-soldiers-scapegoat-level-four-or-higher",
  memory: 5,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: {
      battleArea: [
        { card: "EX8-057", as: "levelThreeNso", suspended: true },
        { card: "EX8-059", as: "levelFourNso", suspended: true },
        { card: "BT1-010", as: "sacrifice" },
      ],
      security: [{ card: "EX8-071", as: "nightmareSoldiers", faceUp: true }, "BT1-009", "BT1-009", "BT1-009"],
      deck: Array(12).fill("BT1-009"),
    },
  },
};

export default fixture;
