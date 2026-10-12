import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "rizegreymon-empty-target",
  memory: 8,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        { card: "ST24-05", as: "base" },
        {
          card: "BT1-085",
          as: "tamer",
          under: [
            { card: "BT1-009", as: "firstCost", faceUp: false },
            { card: "BT1-009", as: "secondCost", faceUp: false },
          ],
        },
      ],
      hand: [
        { card: "ST24-06", as: "rizegreymon" },
        { card: "ST24-02", as: "playable" },
      ],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: { deck: Array(12).fill("BT1-009"), security: 5 },
  },
};

export default fixture;
