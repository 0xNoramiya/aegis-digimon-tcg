import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "sukamon-inherited-protection",
  board: {
    "0": {
      deck: [
        { card: "BT1-085", as: "deck-0-0-card" },
        { card: "BT1-085", as: "deck-0-1-card" },
        { card: "BT1-085", as: "deck-0-2-card" },
        { card: "BT1-085", as: "deck-0-3-card" },
        { card: "BT1-085", as: "deck-0-4-card" },
        { card: "BT1-085", as: "deck-0-5-card" },
        { card: "BT1-085", as: "deck-0-6-card" },
        { card: "BT1-085", as: "deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-085", as: "security-0-0-card" },
        { card: "BT1-085", as: "security-0-1-card" },
        { card: "BT1-085", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "EX13-031",
          as: "own-kingsukamon",
          top: { card: "EX13-031", as: "own-card-kingsukamon-card" },
          dp: 7000,
          placedByEffect: false,
          under: [
            { card: "EX13-027", as: "own-source-kingsukamon-0-card" },
            { card: "EX13-028", as: "own-source-kingsukamon-1-card" },
          ],
        },
        {
          card: "EX13-028",
          as: "own-sukamon",
          top: { card: "EX13-028", as: "own-card-sukamon-card" },
          dp: 2000,
          placedByEffect: false,
          under: [{ card: "EX13-027", as: "own-source-sukamon-0-card" }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "deck-1-0-card" },
        { card: "BT1-085", as: "deck-1-1-card" },
        { card: "BT1-085", as: "deck-1-2-card" },
        { card: "BT1-085", as: "deck-1-3-card" },
        { card: "BT1-085", as: "deck-1-4-card" },
        { card: "BT1-085", as: "deck-1-5-card" },
        { card: "BT1-085", as: "deck-1-6-card" },
        { card: "BT1-085", as: "deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-084", as: "security-omnimon-card" },
        { card: "BT1-085", as: "security-1-0-card" },
        { card: "BT1-085", as: "security-1-1-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
