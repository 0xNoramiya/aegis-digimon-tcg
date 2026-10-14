import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "royal-base-breeding-digivolve-full-cost",
  memory: 6,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      breeding: { card: "BT1-007", as: "breedingBase" },
      battleArea: [{ card: "BT18-044", as: "battleBase" }],
      hand: [
        { card: "BT18-044", as: "breedingRoyalBase" },
        { card: "BT19-048", as: "battleRoyalBase" },
      ],
      deck: Array<string>(8).fill("BT1-009"),
      security: [{ card: "P-181", as: "royalBaseOption", faceUp: true }, "BT1-009", "BT1-009"],
    },
    1: {
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
