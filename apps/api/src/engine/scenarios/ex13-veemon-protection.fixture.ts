import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ex13-veemon-protection",
  board: {
    "0": {
      hand: [
        { card: "AD1-004", as: "veemon-wargreymon-1-card", faceUp: false },
        { card: "AD1-004", as: "veemon-wargreymon-2-card", faceUp: false },
      ],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          8, 31, 15, 1, 20, 4, 43, 9, 22, 17, 26, 12, 47, 34, 5, 11, 30, 35, 48, 25, 0, 27, 44, 29, 40, 7, 32, 19, 2,
          41, 46, 14, 16, 36, 39, 23, 28, 49, 3, 6, 37, 18, 33, 24, 21,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "ST1-09",
          as: "own-veemon-base-1",
          top: { card: "ST1-09", as: "own-card-veemon-base-1-card" },
          dp: 7000,
          placedByEffect: false,
        },
        {
          card: "ST1-09",
          as: "own-veemon-base-2",
          top: { card: "ST1-09", as: "own-card-veemon-base-2-card" },
          dp: 7000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          22, 45, 44, 21, 34, 18, 39, 24, 17, 26, 43, 47, 25, 19, 8, 3, 27, 36, 10, 37, 4, 11, 1, 31, 38, 7, 6, 15, 29,
          35, 28, 41, 5, 48, 13, 2, 46, 0, 32, 23, 30, 20, 16, 12, 40,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [33, 9, 42, 14, 49] }),
      battleArea: [
        {
          card: "BT12-029",
          as: "opponent-veemon-unsuspended",
          top: { card: "BT12-029", as: "opponent-card-veemon-unsuspended-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "EX13-017", as: "opponent-source-veemon-unsuspended-0-card" }],
        },
        {
          card: "BT12-029",
          as: "opponent-veemon-suspended",
          top: { card: "BT12-029", as: "opponent-card-veemon-suspended-card" },
          dp: 12000,
          placedByEffect: false,
          suspended: true,
          under: [{ card: "EX13-017", as: "opponent-source-veemon-suspended-0-card" }],
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
