import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ex12-metalgreymon-forced-attack-digivolve",
  board: {
    "0": {
      hand: [{ card: "EX12-016", as: "metalgreymon-hand-card", faceUp: false }],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          13, 38, 45, 10, 42, 8, 31, 15, 1, 20, 4, 43, 9, 22, 17, 26, 12, 47, 34, 5, 11, 30, 35, 48, 25, 0, 27, 44, 29,
          40, 7, 32, 19, 2, 41, 46, 14, 16, 36, 39, 23, 28, 49, 3, 6, 37, 18, 33, 24, 21,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-011", as: "metalgreymon-security-0-0-card" },
        { card: "BT1-011", as: "metalgreymon-security-0-1-card" },
        { card: "BT1-011", as: "metalgreymon-security-0-2-card" },
        { card: "BT1-011", as: "metalgreymon-security-0-3-card" },
        { card: "BT1-011", as: "metalgreymon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "EX12-010",
          as: "own-metalgreymon-base",
          top: { card: "EX12-010", as: "own-card-metalgreymon-base-card" },
          dp: 5000,
          placedByEffect: false,
        },
      ],
      breeding: {
        card: "BT1-009",
        as: "own-metalgreymon-breeding",
        top: { card: "BT1-009", as: "own-card-metalgreymon-breeding-card" },
        dp: 3000,
        placedByEffect: false,
        inBreeding: false,
      },
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
        { card: "BT1-011", as: "metalgreymon-security-1-0-card" },
        { card: "BT1-011", as: "metalgreymon-security-1-1-card" },
        { card: "BT1-011", as: "metalgreymon-security-1-2-card" },
        { card: "BT1-011", as: "metalgreymon-security-1-3-card" },
        { card: "BT1-011", as: "metalgreymon-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-011",
          as: "opponent-metalgreymon-delete",
          top: { card: "BT1-011", as: "opponent-card-metalgreymon-delete-card" },
          dp: 1000,
          placedByEffect: false,
        },
        {
          card: "BT1-021",
          as: "opponent-metalgreymon-recipient",
          top: { card: "BT1-021", as: "opponent-card-metalgreymon-recipient-card" },
          dp: 7000,
          placedByEffect: false,
        },
        {
          card: "BT1-023",
          as: "opponent-metalgreymon-other",
          top: { card: "BT1-023", as: "opponent-card-metalgreymon-other-card" },
          dp: 7000,
          placedByEffect: false,
        },
      ],
      breeding: {
        card: "BT1-009",
        as: "opponent-metalgreymon-breeding",
        top: { card: "BT1-009", as: "opponent-card-metalgreymon-breeding-card" },
        dp: 3000,
        placedByEffect: false,
        inBreeding: false,
      },
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
