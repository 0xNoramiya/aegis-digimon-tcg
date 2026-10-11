import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "gankoomon-dual-sources",
  board: {
    "0": {
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      trash: [{ card: "ST12-12", as: "gankoomon-dual-sources-0-trash-0-card" }],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "EX13-061",
          as: "gankoomon-dual-sources-0-field-0",
          top: { card: "EX13-061", as: "gankoomon-dual-sources-0-field-0-card" },
          dp: 13000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "EX13-065", as: "gankoomon-dual-sources-0-source-0-0-card" },
            { card: "EX13-066", as: "gankoomon-dual-sources-0-source-0-1-card" },
          ],
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
        { card: "BT1-009", as: "gankoomon-dual-sources-1-security-0-card" },
        { card: "BT1-010", as: "gankoomon-dual-sources-1-security-1-card" },
        { card: "BT1-011", as: "gankoomon-dual-sources-1-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-080",
          as: "gankoomon-dual-sources-1-field-0",
          top: { card: "BT1-080", as: "gankoomon-dual-sources-1-field-0-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "BT1-013", as: "gankoomon-dual-sources-1-source-0-0-card" },
            { card: "BT1-020", as: "gankoomon-dual-sources-1-source-0-1-card" },
          ],
        },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
