import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "seven-code-link-dp",
  board: {
    "0": {
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
          card: "BT26-028",
          as: "own-seven-code-receiving-control",
          top: { card: "BT26-028", as: "own-card-seven-code-receiving-control-card" },
          dp: 5000,
          currentDP: 7000,
          placedByEffect: false,
          linked: [{ card: "BT21-009", as: "link-bt21-gatchmon-card" }],
        },
        {
          card: "BT21-023",
          as: "own-seven-code-giving",
          top: { card: "BT21-023", as: "own-card-seven-code-giving-card" },
          dp: 10000,
          currentDP: 13000,
          placedByEffect: false,
          linked: [{ card: "BT26-037", as: "link-weatherdramon-card" }],
        },
        {
          card: "BT26-037",
          as: "own-seven-code-both",
          top: { card: "BT26-037", as: "own-card-seven-code-both-card" },
          dp: 5000,
          currentDP: 8000,
          placedByEffect: false,
          linked: [{ card: "BT26-028", as: "link-medicmon-card" }],
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
    },
  },
  memory: 0,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
