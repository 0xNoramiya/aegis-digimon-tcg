import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt12-mikemon-own-battle-only",
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
          card: "BT12-038",
          as: "own-mikemon-host",
          top: { card: "BT12-038", as: "own-card-mikemon-host-card" },
          dp: 5000,
          placedByEffect: false,
          under: [{ card: "BT12-036", as: "own-source-mikemon-host-0-card" }],
        },
        {
          card: "BT12-038",
          as: "own-mikemon-neighbor",
          top: { card: "BT12-038", as: "own-card-mikemon-neighbor-card" },
          dp: 5000,
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
          card: "BT1-009",
          as: "opponent-mikemon-first-target",
          top: { card: "BT1-009", as: "opponent-card-mikemon-first-target-card" },
          dp: 3000,
          placedByEffect: false,
          suspended: true,
        },
        {
          card: "BT1-009",
          as: "opponent-mikemon-second-target",
          top: { card: "BT1-009", as: "opponent-card-mikemon-second-target-card" },
          dp: 3000,
          placedByEffect: false,
          suspended: true,
        },
      ],
    },
  },
  memory: 0,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
