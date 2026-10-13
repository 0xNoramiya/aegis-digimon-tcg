import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "ladydevimon-option-use-after-trash-cost",
  memory: 10,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        { card: "BT25-082", as: "base", under: [{ card: "P-180", as: "sourceOption" }] },
        { card: "BT1-009", as: "redDigimon" },
      ],
      hand: [{ card: "BT25-083", as: "ladyDevimon" }],
      trash: [{ card: "P-180", as: "trashOption" }],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "victim" }],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
