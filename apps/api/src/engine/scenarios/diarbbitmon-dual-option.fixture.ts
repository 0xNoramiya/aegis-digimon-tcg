import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "diarbbitmon-dual-option",
  board: {
    "0": {
      hand: [
        { card: "EX12-052", as: "diarbbitmon-dual-option-0-hand-0-card", faceUp: false },
        { card: "BT1-082", as: "diarbbitmon-dual-option-0-hand-1-card", faceUp: false },
      ],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "EX12-051",
          as: "diarbbitmon-dual-option-0-field-0",
          top: { card: "EX12-051", as: "diarbbitmon-dual-option-0-field-0-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [{ card: "EX13-065", as: "diarbbitmon-dual-option-1-hand-0-card", faceUp: false }],
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      trash: [{ card: "ST12-12", as: "diarbbitmon-dual-option-1-trash-0-card" }],
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "EX13-061",
          as: "diarbbitmon-dual-option-1-field-0",
          top: { card: "EX13-061", as: "diarbbitmon-dual-option-1-field-0-card" },
          dp: 13000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "EX13-065", as: "diarbbitmon-dual-option-1-source-0-0-card" },
            { card: "EX13-066", as: "diarbbitmon-dual-option-1-source-0-1-card" },
          ],
        },
        {
          card: "BT6-082",
          as: "diarbbitmon-dual-option-1-field-1",
          top: { card: "BT6-082", as: "diarbbitmon-dual-option-1-field-1-card" },
          dp: 3000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
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
