import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "belphemon-discard-controller",
  memory: 10,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT2-077", as: "base" }],
      hand: [
        { card: "EX6-060", as: "belphemon" },
        { card: "BT1-009", as: "ownPayment" },
      ],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "target" }],
      hand: [{ card: "BT1-010", as: "opponentHand" }],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
  },
};

export default fixture;
