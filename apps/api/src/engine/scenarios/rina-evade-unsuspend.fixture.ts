import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "rina-evade-unsuspend",
  board: {
    "0": {
      hand: [{ card: "EX13-019", as: "rina-evade-veedramon-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "rina-evade-draw-0-card" },
        { card: "BT1-009", as: "rina-evade-draw-1-card" },
        { card: "BT1-009", as: "rina-evade-draw-2-card" },
        { card: "BT1-009", as: "rina-evade-draw-3-card" },
        { card: "BT1-009", as: "rina-evade-draw-4-card" },
        { card: "BT1-009", as: "rina-evade-draw-5-card" },
        { card: "BT1-009", as: "rina-evade-draw-6-card" },
        { card: "BT1-009", as: "rina-evade-draw-7-card" },
        { card: "BT1-009", as: "rina-evade-draw-8-card" },
        { card: "BT1-009", as: "rina-evade-draw-9-card" },
        { card: "BT1-009", as: "rina-evade-draw-10-card" },
        { card: "BT1-009", as: "rina-evade-draw-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "BT11-023",
          as: "own-rina-evade-veemon",
          top: { card: "BT11-023", as: "own-card-rina-evade-veemon-card" },
          dp: 1000,
          placedByEffect: false,
          suspended: true,
        },
        {
          card: "BT11-112",
          as: "own-rina-evade-bt11",
          top: { card: "BT11-112", as: "own-card-rina-evade-bt11-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "EX13-069",
          as: "own-rina-evade-ex13",
          top: { card: "EX13-069", as: "own-card-rina-evade-ex13-card" },
          dp: 0,
          placedByEffect: false,
          suspended: true,
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
          card: "EX13-066",
          as: "opponent-rina-evade-noir",
          top: { card: "EX13-066", as: "opponent-card-rina-evade-noir-card" },
          dp: 6000,
          placedByEffect: false,
          under: [{ card: "BT6-084", as: "opponent-source-rina-evade-noir-0-card" }],
        },
        {
          card: "ST12-12",
          as: "opponent-rina-evade-blanc",
          top: { card: "ST12-12", as: "opponent-card-rina-evade-blanc-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT13-013",
          as: "opponent-rina-evade-savior",
          top: { card: "BT13-013", as: "opponent-card-rina-evade-savior-card" },
          dp: 5000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 6,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
