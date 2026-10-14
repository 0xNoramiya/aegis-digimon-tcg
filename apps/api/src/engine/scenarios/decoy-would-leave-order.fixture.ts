import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "decoy-would-leave-order",
  memory: 3,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-009", as: "redOptionColor" }],
      hand: [
        { card: "ST1-16", as: "removal" },
        { card: "BT8-097", as: "sweep" },
      ],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [
        { card: "TOKEN-AthoRenePor-Token", as: "decoyHolder" },
        {
          card: "BT1-024",
          as: "endangered",
          under: [
            { card: "BT1-014", as: "playableSource" },
            { card: "BT24-037", as: "wouldLeaveSource" },
          ],
        },
        { card: "BT1-009", as: "firstBystander" },
        { card: "BT1-009", as: "secondBystander" },
      ],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
