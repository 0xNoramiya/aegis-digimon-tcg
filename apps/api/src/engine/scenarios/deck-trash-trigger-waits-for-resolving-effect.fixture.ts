import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "deck-trash-trigger-waits-for-resolving-effect",
  board: {
    0: {
      battleArea: [{ card: "EX10-074", as: "attacker" }],
      deck: [
        { card: "BT1-009", as: "turnDraw" },
        { card: "EX2-039", as: "milledImpmon" },
        { card: "BT1-009", as: "milledFiller" },
        { card: "EX2-044", as: "milledBeelzemon" },
        ...Array<string>(10).fill("BT1-009"),
      ],
      security: 5,
    },
    1: {
      battleArea: [{ card: "BT9-033", as: "playLock" }],
      deck: Array<string>(10).fill("BT1-009"),
      security: 5,
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
