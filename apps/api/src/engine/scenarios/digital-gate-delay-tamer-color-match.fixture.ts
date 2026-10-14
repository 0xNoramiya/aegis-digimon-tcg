import type { ScenarioFixture } from "../scenario/types.js";

function delayBoard(breedingCard: string): ScenarioFixture {
  return {
    name: "digital-gate-delay-tamer-color-match",
    board: {
      0: {
        battleArea: [
          { card: "P-206", as: "digitalGate" },
          { card: "EX9-066", as: "fieldTaiAndMatt" },
        ],
        breeding: { card: breedingCard, as: "hatchedEgg" },
        hand: [{ card: "EX9-066", as: "handTaiAndMatt" }],
        deck: [{ card: "BT1-010", as: "turnDraw" }, ...Array<string>(7).fill("BT1-010")],
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: {
        deck: Array<string>(8).fill("BT1-010"),
        eggDeck: ["BT1-001"],
        security: 3,
      },
    },
    memory: 3,
    turnSeat: 0,
    turnCount: 3,
    isFirstPlayersFirstTurn: false,
  };
}

export const sameColorBreedingFixture = delayBoard("BT1-001");

export default delayBoard("BT22-005");
