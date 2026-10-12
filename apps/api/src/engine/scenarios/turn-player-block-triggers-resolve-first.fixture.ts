import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  memory: 3,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "EX12-019", as: "nezhamon", under: [{ card: "BT1-024", as: "metalTyrannomon" }] }],
      deck: Array<string>(8).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: {
      battleArea: [{ card: "EX13-061", as: "gankoomon" }],
      hand: [{ card: "EX13-066", as: "sistermonNoirAwakened" }],
      deck: Array<string>(8).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: ["ST1-03", "ST1-03", "ST1-03"],
    },
  },
  presentation: { holdBotAfterTurn: 1 },
};

export default fixture;
