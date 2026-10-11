import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "mobile-blast-counter-tap",
  board: {
    "0": {
      hand: [
        { card: "EX10-010", as: "blast-blackwargreymon-card", faceUp: false },
        {
          card: "BT1-029",
          as: "own-deck-slot-8-card",
          faceUp: false,
          artId: "BT1-029",
          fromDeck: { seat: 0, index: 8 },
        },
        {
          card: "BT1-034",
          as: "own-deck-slot-31-card",
          faceUp: false,
          artId: "BT1-034",
          fromDeck: { seat: 0, index: 31 },
        },
        {
          card: "BT1-030",
          as: "own-deck-slot-15-card",
          faceUp: false,
          artId: "BT1-030",
          fromDeck: { seat: 0, index: 15 },
        },
        {
          card: "BT1-027",
          as: "own-deck-slot-1-card",
          faceUp: false,
          artId: "BT1-027",
          fromDeck: { seat: 0, index: 1 },
        },
      ],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          20, 4, 43, 9, 22, 17, 26, 12, 47, 34, 5, 11, 30, 35, 48, 25, 0, 27, 44, 29, 40, 7, 32, 19, 2, 41, 46, 14, 16,
          36, 39, 23, 28, 49, 3, 6, 37, 18, 33, 24, 21,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "BT13-071",
          as: "own-blast-host",
          top: { card: "BT13-071", as: "own-card-blast-host-card" },
          dp: 8000,
          currentDP: 10000,
          placedByEffect: false,
          under: [
            { card: "BT13-061", as: "own-source-blast-host-0-card" },
            { card: "BT13-065", as: "own-source-blast-host-1-card" },
          ],
        },
        {
          card: "BT13-062",
          as: "own-blast-bystander",
          top: { card: "BT13-062", as: "own-card-blast-bystander-card" },
          dp: 1000,
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
          card: "ST1-10",
          as: "opponent-blast-attacker",
          top: { card: "ST1-10", as: "opponent-card-blast-attacker-card" },
          dp: 12000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 0,
  turnSeat: 1,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
