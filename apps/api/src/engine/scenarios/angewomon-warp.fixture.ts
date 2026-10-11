import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "angewomon-warp",
  board: {
    "0": {
      hand: [
        { card: "ST20-06", as: "angewomon-warp-0-hand-0-card", faceUp: false },
        { card: "ST20-11", as: "angewomon-warp-0-hand-1-card", faceUp: false },
        { card: "ST21-11", as: "angewomon-warp-0-hand-2-card", faceUp: false },
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
          card: "ST20-10",
          as: "angewomon-warp-0-field-0",
          top: { card: "ST20-10", as: "angewomon-warp-0-field-0-card" },
          dp: 1000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "ST21-10",
          as: "angewomon-warp-0-field-1",
          top: { card: "ST21-10", as: "angewomon-warp-0-field-1-card" },
          dp: 1000,
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
          card: "BT1-024",
          as: "angewomon-warp-1-field-0",
          top: { card: "BT1-024", as: "angewomon-warp-1-field-0-card" },
          dp: 10000,
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
