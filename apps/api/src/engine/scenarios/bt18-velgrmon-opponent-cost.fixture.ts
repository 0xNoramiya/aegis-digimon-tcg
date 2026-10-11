import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt18-velgrmon-opponent-cost",
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
      security: [
        { card: "BT1-010", as: "velgrmon-security-0-0-card" },
        { card: "BT1-010", as: "velgrmon-security-0-1-card" },
        { card: "BT1-010", as: "velgrmon-security-0-2-card" },
        { card: "BT1-010", as: "velgrmon-security-0-3-card" },
        { card: "BT1-010", as: "velgrmon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT18-079",
          as: "own-velgrmon",
          top: { card: "BT18-079", as: "own-card-velgrmon-card" },
          dp: 7000,
          placedByEffect: false,
          under: [{ card: "BT2-067", as: "own-source-velgrmon-0-card" }],
        },
        {
          card: "BT18-077",
          as: "own-velgrmon-own-cost",
          top: { card: "BT18-077", as: "own-card-velgrmon-own-cost-card" },
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
      security: [
        { card: "BT1-010", as: "velgrmon-security-1-0-card" },
        { card: "BT1-010", as: "velgrmon-security-1-1-card" },
        { card: "BT1-010", as: "velgrmon-security-1-2-card" },
        { card: "BT1-010", as: "velgrmon-security-1-3-card" },
        { card: "BT1-010", as: "velgrmon-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "BT18-077",
          as: "opponent-velgrmon-opponent-cost",
          top: { card: "BT18-077", as: "opponent-card-velgrmon-opponent-cost-card" },
          dp: 7000,
          placedByEffect: false,
        },
        {
          card: "BT1-038",
          as: "opponent-velgrmon-lowest-one",
          top: { card: "BT1-038", as: "opponent-card-velgrmon-lowest-one-card" },
          dp: 6000,
          placedByEffect: false,
        },
        {
          card: "BT1-039",
          as: "opponent-velgrmon-lowest-two",
          top: { card: "BT1-039", as: "opponent-card-velgrmon-lowest-two-card" },
          dp: 6000,
          placedByEffect: false,
        },
        {
          card: "BT1-044",
          as: "opponent-velgrmon-higher",
          top: { card: "BT1-044", as: "opponent-card-velgrmon-higher-card" },
          dp: 11000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
