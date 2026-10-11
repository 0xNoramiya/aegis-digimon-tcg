import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "tsunomon-jupitermon-zero",
  board: {
    "0": {
      hand: [{ card: "BT24-101", as: "tsunomon-jupitermon-zero-0-hand-0-card", faceUp: false }],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "tsunomon-jupitermon-zero-0-security-0-card" },
        { card: "BT1-009", as: "tsunomon-jupitermon-zero-0-security-1-card" },
      ],
      battleArea: [
        {
          card: "P-213",
          as: "tsunomon-jupitermon-zero-0-field-0",
          top: { card: "P-213", as: "tsunomon-jupitermon-zero-0-field-0-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "BT24-003", as: "tsunomon-jupitermon-zero-0-source-0-0-card" },
            { card: "P-194", as: "tsunomon-jupitermon-zero-0-source-0-1-card" },
          ],
        },
        {
          card: "BT24-022",
          as: "tsunomon-jupitermon-zero-0-field-1",
          top: { card: "BT24-022", as: "tsunomon-jupitermon-zero-0-field-1-card" },
          dp: 6000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT24-031", as: "tsunomon-jupitermon-zero-0-source-1-0-card" }],
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
      security: [
        { card: "BT1-009", as: "tsunomon-jupitermon-zero-1-security-0-card" },
        { card: "BT1-010", as: "tsunomon-jupitermon-zero-1-security-1-card" },
        { card: "BT1-011", as: "tsunomon-jupitermon-zero-1-security-2-card" },
      ],
    },
  },
  memory: 8,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
