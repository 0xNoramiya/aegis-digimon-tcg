import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "lanamon-tamer-cost",
  board: {
    "0": {
      hand: [
        { card: "BT12-024", as: "lanamon-0-card" },
        { card: "BT12-024", as: "lanamon-1-card" },
        { card: "BT12-024", as: "lanamon-2-card" },
      ],
      deck: [
        { card: "BT1-009", as: "draw-0-0-card" },
        { card: "BT1-009", as: "draw-0-1-card" },
        { card: "BT1-009", as: "draw-0-2-card" },
        { card: "BT1-009", as: "draw-0-3-card" },
        { card: "BT1-009", as: "draw-0-4-card" },
        { card: "BT1-009", as: "draw-0-5-card" },
        { card: "BT1-009", as: "draw-0-6-card" },
        { card: "BT1-009", as: "draw-0-7-card" },
        { card: "BT1-009", as: "draw-0-8-card" },
        { card: "BT1-009", as: "draw-0-9-card" },
        { card: "BT1-009", as: "draw-0-10-card" },
        { card: "BT1-009", as: "draw-0-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "BT11-112",
          as: "own-rina",
          top: { card: "BT11-112", as: "own-card-rina-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT12-021",
          as: "own-rookie",
          top: { card: "BT12-021", as: "own-card-rookie-card" },
          dp: 1000,
          placedByEffect: false,
        },
        {
          card: "BT12-025",
          as: "own-calmaramon",
          top: { card: "BT12-025", as: "own-card-calmaramon-card" },
          dp: 6000,
          placedByEffect: false,
        },
        {
          card: "BT12-088",
          as: "own-red-tamer",
          top: { card: "BT12-088", as: "own-card-red-tamer-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "draw-1-0-card" },
        { card: "BT1-009", as: "draw-1-1-card" },
        { card: "BT1-009", as: "draw-1-2-card" },
        { card: "BT1-009", as: "draw-1-3-card" },
        { card: "BT1-009", as: "draw-1-4-card" },
        { card: "BT1-009", as: "draw-1-5-card" },
        { card: "BT1-009", as: "draw-1-6-card" },
        { card: "BT1-009", as: "draw-1-7-card" },
        { card: "BT1-009", as: "draw-1-8-card" },
        { card: "BT1-009", as: "draw-1-9-card" },
        { card: "BT1-009", as: "draw-1-10-card" },
        { card: "BT1-009", as: "draw-1-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [33, 9, 42, 14, 49] }),
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
