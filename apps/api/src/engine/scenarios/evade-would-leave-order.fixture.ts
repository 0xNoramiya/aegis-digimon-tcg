import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "evade-would-leave-order",
  memory: 3,
  turnSeat: 1,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        {
          card: "BT13-031",
          as: "evadeHolder",
          under: [
            { card: "BT1-014", as: "playableSource" },
            { card: "BT24-037", as: "wouldLeaveSource" },
          ],
        },
      ],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [{ card: "BT20-102", as: "attacker" }],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
