import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT25-071", as: "levelFiveTitan" }],
      hand: [
        { card: "BT26-059", as: "plutomon" },
        { card: "ST1-03", as: "discardedCard" },
      ],
      trash: [{ card: "BT26-079", as: "zombiePlutomon" }],
      deck: Array<string>(8).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: { deck: Array<string>(8).fill("ST1-03"), eggDeck: ["BT1-001"], security: ["ST1-03", "ST1-03", "ST1-03"] },
  },
  presentation: { holdBotAfterTurn: 1 },
};

export default fixture;
