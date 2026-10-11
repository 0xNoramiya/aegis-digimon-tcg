import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "sharkmon-shellmon",
  board: {
    "0": {
      hand: [{ card: "BT24-059", as: "sharkmon-shellmon-0-hand-0-card", faceUp: false }],
      deck: [
        { card: "BT1-015", as: "sharkmon-shellmon-0-deck-0-card" },
        { card: "BT1-015", as: "sharkmon-shellmon-0-deck-1-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "EX12-026",
          as: "sharkmon-shellmon-0-field-0",
          top: { card: "EX12-026", as: "sharkmon-shellmon-0-field-0-card" },
          dp: 5000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "BT24-051",
          as: "sharkmon-shellmon-1-field-0",
          top: { card: "BT24-051", as: "sharkmon-shellmon-1-field-0-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT24-050", as: "sharkmon-shellmon-1-source-0-0-card" }],
        },
      ],
    },
  },
  memory: 8,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
