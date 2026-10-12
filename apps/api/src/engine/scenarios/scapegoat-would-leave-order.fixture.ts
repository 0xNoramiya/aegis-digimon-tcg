import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "scapegoat-would-leave-order",
  memory: 3,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT20-102", as: "attacker" }],
      hand: [{ card: "ST1-16", as: "removal" }],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [
        {
          card: "EX6-059",
          as: "scapegoatHolder",
          under: [
            { card: "BT1-014", as: "playableSource" },
            { card: "BT24-037", as: "wouldLeaveSource" },
          ],
        },
        { card: "BT1-019", as: "bystander" },
      ],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
