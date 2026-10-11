import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "alliance-20",
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
          card: "BT23-020",
          as: "own-alliance-attacker",
          top: { card: "BT23-020", as: "own-card-alliance-attacker-card" },
          dp: 5000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-1",
          top: { card: "BT1-010", as: "own-card-alliance-ally-1-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-2",
          top: { card: "BT1-010", as: "own-card-alliance-ally-2-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-3",
          top: { card: "BT1-010", as: "own-card-alliance-ally-3-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-4",
          top: { card: "BT1-010", as: "own-card-alliance-ally-4-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-5",
          top: { card: "BT1-010", as: "own-card-alliance-ally-5-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-6",
          top: { card: "BT1-010", as: "own-card-alliance-ally-6-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-7",
          top: { card: "BT1-010", as: "own-card-alliance-ally-7-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-8",
          top: { card: "BT1-010", as: "own-card-alliance-ally-8-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-9",
          top: { card: "BT1-010", as: "own-card-alliance-ally-9-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-10",
          top: { card: "BT1-010", as: "own-card-alliance-ally-10-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-11",
          top: { card: "BT1-010", as: "own-card-alliance-ally-11-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-12",
          top: { card: "BT1-010", as: "own-card-alliance-ally-12-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-13",
          top: { card: "BT1-010", as: "own-card-alliance-ally-13-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-14",
          top: { card: "BT1-010", as: "own-card-alliance-ally-14-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-15",
          top: { card: "BT1-010", as: "own-card-alliance-ally-15-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-16",
          top: { card: "BT1-010", as: "own-card-alliance-ally-16-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-17",
          top: { card: "BT1-010", as: "own-card-alliance-ally-17-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-18",
          top: { card: "BT1-010", as: "own-card-alliance-ally-18-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "own-alliance-ally-19",
          top: { card: "BT1-010", as: "own-card-alliance-ally-19-card" },
          dp: 2000,
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
    },
  },
  memory: 0,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
