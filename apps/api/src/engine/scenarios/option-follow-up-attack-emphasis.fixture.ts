import type { ScenarioFixture } from "#api/engine/scenario/types";

export default {
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT25-046", as: "gekkomon" }],
      hand: [{ card: "BT25-057", as: "finalJudgment" }],
      deck: Array<string>(8).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: { deck: Array<string>(8).fill("ST1-03"), security: ["ST1-03", "ST1-03", "ST1-03"] },
  },
} satisfies ScenarioFixture;
