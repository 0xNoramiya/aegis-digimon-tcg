import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "arts-digivolve-before-opponent-security-trigger",
  board: {
    "0": {
      hand: [{ card: "BT26-033", as: "wide-plasment" }],
      deck: ["BT1-085", "BT1-085", "BT1-085", "BT1-085", "BT1-085", "BT1-085"],
      eggDeck: ["BT1-001"],
      security: [
        { card: "BT1-085", as: "own-top-security" },
        { card: "BT1-085", as: "own-bottom-security" },
      ],
      battleArea: [
        {
          card: "BT25-025",
          as: "arts-base",
          top: { card: "BT25-025", as: "arts-base-card" },
          under: ["BT24-034"],
        },
      ],
    },
    "1": {
      deck: ["BT1-085", "BT1-085", "BT1-085", "BT1-085", "BT1-085", "BT1-085"],
      eggDeck: ["BT1-001"],
      security: [
        { card: "BT1-085", as: "opponent-top-security" },
        { card: "BT1-085", as: "opponent-middle-security" },
        { card: "BT1-085", as: "opponent-bottom-security" },
      ],
      battleArea: [{ card: "EX13-034", as: "opponent-wisemon", under: ["EX13-029"] }],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 6,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
