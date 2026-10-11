import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "prod-security-removed",
  board: {
    "0": {
      hand: [{ card: "BT25-025", as: "lab-security-aegiochusmon-card", faceUp: false }],
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
          card: "BT26-103",
          as: "own-lab-security-wrath",
          top: { card: "BT26-103", as: "own-card-lab-security-wrath-card" },
          dp: 16000,
          placedByEffect: false,
          under: [{ card: "BT24-031", as: "own-source-lab-security-wrath-0-card" }],
        },
        {
          card: "BT24-101",
          as: "own-lab-security-jupitermon",
          top: { card: "BT24-101", as: "own-card-lab-security-jupitermon-card" },
          dp: 13000,
          placedByEffect: false,
        },
        {
          card: "BT24-034",
          as: "own-lab-security-aegiomon",
          top: { card: "BT24-034", as: "own-card-lab-security-aegiomon-card" },
          dp: 5000,
          placedByEffect: false,
        },
        {
          card: "BT24-084",
          as: "own-lab-security-inori",
          top: { card: "BT24-084", as: "own-card-lab-security-inori-card" },
          dp: 0,
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
        { card: "BT1-009", as: "lab-security-1-0-card" },
        { card: "BT1-020", as: "opponent-deck-slot-33-card", artId: "BT1-020", fromDeck: { seat: 1, index: 33 } },
        { card: "BT1-011", as: "opponent-deck-slot-9-card", artId: "BT1-011", fromDeck: { seat: 1, index: 9 } },
        { card: "BT1-017", as: "opponent-deck-slot-42-card", artId: "BT1-017", fromDeck: { seat: 1, index: 42 } },
        { card: "BT1-012", as: "opponent-deck-slot-14-card", artId: "BT1-012", fromDeck: { seat: 1, index: 14 } },
      ],
      battleArea: [
        {
          card: "BT1-010",
          as: "opponent-lab-security-target",
          top: { card: "BT1-010", as: "opponent-card-lab-security-target-card" },
          dp: 2000,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "opponent-source-lab-security-target-0-card" }],
        },
        {
          card: "BT1-009",
          as: "opponent-lab-security-second-target",
          top: { card: "BT1-009", as: "opponent-card-lab-security-second-target-card" },
          dp: 3000,
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
