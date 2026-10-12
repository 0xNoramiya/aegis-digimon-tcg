import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      hand: [
        { card: "BT21-021", as: "omniShoutmon" },
        { card: "BT6-008", as: "shoutmon" },
      ],
      battleArea: [{ card: "BT21-080", as: "hiro" }],
      deck: Array<string>(8).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-020", as: "opponentDigimon" }],
      deck: Array<string>(8).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: ["ST1-03", "ST1-03", "ST1-03"],
    },
  },
  presentation: { holdBotAfterTurn: 1 },
};

export default fixture;
