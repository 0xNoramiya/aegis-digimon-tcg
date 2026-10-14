import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "paladin-source-stripping",
  memory: 10,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: {
    holdBotAfterTurn: 6,
    opponent: { endBreeding: true, main: [{ kind: "play", card: "BT17-077" }], fallbackMain: "end" },
  },
  board: {
    0: {
      battleArea: [{ card: "EX12-054", as: "ally", under: [{ card: "EX12-053", as: "allySource" }] }],
      hand: [
        { card: "EX12-059", as: "machinedramon" },
        { card: "EX12-053", as: "firstMaterial" },
        { card: "EX12-055", as: "secondMaterial" },
      ],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: {
      hand: [{ card: "BT17-077", as: "paladin" }],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
  },
};

export default fixture;
