import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt23-bakemon-no-target",
  board: {
    "0": {
      hand: [
        { card: "EX11-051", as: "bakemon-necromon-play-card", faceUp: false },
        { card: "EX11-051", as: "bakemon-necromon-digivolve-card", faceUp: false },
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
      trash: [
        { card: "BT23-064", as: "bakemon-revive-first-card" },
        { card: "BT23-064", as: "bakemon-revive-second-card" },
        { card: "BT23-061", as: "bakemon-ghost-decoy-card" },
      ],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "BT2-075",
          as: "own-bakemon-necromon-base",
          top: { card: "BT2-075", as: "own-card-bakemon-necromon-base-card" },
          dp: 7000,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "own-bakemon-fodder-first",
          top: { card: "BT1-009", as: "own-card-bakemon-fodder-first-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "own-bakemon-fodder-second",
          top: { card: "BT1-009", as: "own-card-bakemon-fodder-second-card" },
          dp: 3000,
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
          card: "BT1-014",
          as: "opponent-bakemon-necromon-target-first",
          top: { card: "BT1-014", as: "opponent-card-bakemon-necromon-target-first-card" },
          dp: 4000,
          placedByEffect: false,
        },
        {
          card: "BT1-024",
          as: "opponent-bakemon-too-high-first",
          top: { card: "BT1-024", as: "opponent-card-bakemon-too-high-first-card" },
          dp: 10000,
          placedByEffect: false,
        },
        {
          card: "BT1-024",
          as: "opponent-bakemon-too-high-second",
          top: { card: "BT1-024", as: "opponent-card-bakemon-too-high-second-card" },
          dp: 10000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 15,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  allowOutOfRangeMemory: true,
};

export default fixture;
