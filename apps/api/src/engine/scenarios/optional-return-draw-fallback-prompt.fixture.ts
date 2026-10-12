import type { ScenarioFixture } from "#api/engine/scenario/types";

export function optionalReturnDrawFallbackPrompt(): ScenarioFixture {
  return {
    memory: 3,
    turnSeat: 0,
    turnCount: 0,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [
          { card: "P-206", as: "digitalGateOpen" },
          { card: "BT1-009", as: "redDigimon" },
        ],
        hand: [{ card: "EX9-066", as: "taiAndMatt" }],
        trash: [{ card: "BT1-015", as: "onlyReturnTarget" }],
        deck: [
          { card: "BT1-010", as: "turnDraw" },
          { card: "BT1-048", as: "fallbackDraw" },
          ...Array<string>(6).fill("BT1-010"),
        ],
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: { deck: Array<string>(8).fill("BT1-010"), eggDeck: ["BT1-001"], security: 3 },
    },
  };
}

export default optionalReturnDrawFallbackPrompt();
