import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "tai-kari-ukkomon-hatch",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "tai-kari-draw-0-card" },
        { card: "BT1-009", as: "tai-kari-draw-1-card" },
        { card: "BT1-009", as: "tai-kari-draw-2-card" },
        { card: "BT1-009", as: "tai-kari-draw-3-card" },
        { card: "BT1-009", as: "tai-kari-draw-4-card" },
        { card: "BT1-009", as: "tai-kari-draw-5-card" },
        { card: "BT1-009", as: "tai-kari-draw-6-card" },
        { card: "BT1-009", as: "tai-kari-draw-7-card" },
        { card: "BT1-009", as: "tai-kari-draw-8-card" },
        { card: "BT1-009", as: "tai-kari-draw-9-card" },
        { card: "BT1-009", as: "tai-kari-draw-10-card" },
        { card: "BT1-009", as: "tai-kari-draw-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "tai-kari-egg-card" }],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "BT16-082",
          as: "own-tai-kari-ukko",
          top: { card: "BT16-082", as: "own-card-tai-kari-ukko-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT17-093",
          as: "own-tai-kari-tamer",
          top: { card: "BT17-093", as: "own-card-tai-kari-tamer-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
      breeding: {
        card: "BT1-009",
        as: "own-tai-kari-raised",
        top: { card: "BT1-009", as: "own-card-tai-kari-raised-card" },
        dp: 3000,
        placedByEffect: false,
      },
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
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
