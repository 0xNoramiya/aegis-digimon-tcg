import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "decoy-protect-choice",
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
          card: "BT1-080",
          as: "own-decoy-attacker",
          top: { card: "BT1-080", as: "own-card-decoy-attacker-card" },
          dp: 12000,
          placedByEffect: false,
        },
        {
          card: "EX13-047",
          as: "own-decoy-gotsumon",
          top: { card: "EX13-047", as: "own-card-decoy-gotsumon-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "own-decoy-monodramon",
          top: { card: "BT1-009", as: "own-card-decoy-monodramon-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-decoy-agumon",
          top: { card: "BT1-010", as: "own-card-decoy-agumon-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "TOKEN-AthoRenePor-Token",
          as: "own-decoy-token",
          top: { card: "TOKEN-AthoRenePor-Token", as: "own-card-decoy-token-card" },
          dp: 6000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          49, 14, 42, 9, 33, 22, 45, 44, 21, 34, 18, 39, 24, 17, 26, 43, 47, 25, 19, 8, 3, 27, 36, 10, 37, 4, 11, 1, 31,
          38, 7, 6, 15, 29, 35, 28, 41, 5, 48, 13, 2, 46, 0, 32, 23, 30, 20, 16, 12, 40,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT8-097", as: "decoy-crimson-blaze-card" },
        { card: "BT1-009", as: "decoy-last-security-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
