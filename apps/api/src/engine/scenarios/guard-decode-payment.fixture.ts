import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "guard-decode-payment",
  memory: 10,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-009", as: "red" }],
      hand: [{ card: "ST1-16", as: "removal" }],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: {
      battleArea: [
        { card: "EX12-035", as: "guard", under: [{ card: "EX12-064", as: "decoded" }] },
        { card: "EX12-041", as: "target" },
      ],
      security: [{ card: "EX12-072", as: "guardGrant", faceUp: true }, "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      deck: Array(12).fill("BT1-009"),
    },
  },
};

export default fixture;
