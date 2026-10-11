import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "prod-attack-stack",
  board: {
    "0": {
      hand: [{ card: "EX13-077", as: "lab-attack-zwart-card", faceUp: false }],
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
          card: "AD1-025",
          as: "own-lab-attack-omnimon",
          top: { card: "AD1-025", as: "own-card-lab-attack-omnimon-card" },
          dp: 15000,
          placedByEffect: false,
          under: [
            { card: "EX9-019", as: "own-source-lab-attack-omnimon-0-card" },
            { card: "AD1-014", as: "own-source-lab-attack-omnimon-1-card" },
            { card: "ST21-05", as: "own-source-lab-attack-omnimon-2-card" },
            { card: "AD1-004", as: "own-source-lab-attack-omnimon-3-card" },
          ],
        },
      ],
    },
    "1": {
      hand: [{ card: "BT25-058", as: "lab-attack-callismon-card", faceUp: false }],
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
        { card: "BT26-090", as: "lab-security-1-0-card" },
        { card: "BT1-020", as: "opponent-deck-slot-33-card", artId: "BT1-020", fromDeck: { seat: 1, index: 33 } },
        { card: "BT1-011", as: "opponent-deck-slot-9-card", artId: "BT1-011", fromDeck: { seat: 1, index: 9 } },
        { card: "BT1-017", as: "opponent-deck-slot-42-card", artId: "BT1-017", fromDeck: { seat: 1, index: 42 } },
        { card: "BT1-012", as: "opponent-deck-slot-14-card", artId: "BT1-012", fromDeck: { seat: 1, index: 14 } },
      ],
      battleArea: [
        {
          card: "BT1-011",
          as: "opponent-lab-attack-target-first",
          top: { card: "BT1-011", as: "opponent-card-lab-attack-target-first-card" },
          dp: 1000,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "opponent-source-lab-attack-target-first-0-card" }],
        },
        {
          card: "BT1-011",
          as: "opponent-lab-attack-target-second",
          top: { card: "BT1-011", as: "opponent-card-lab-attack-target-second-card" },
          dp: 1000,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "opponent-source-lab-attack-target-second-0-card" }],
        },
        {
          card: "BT1-011",
          as: "opponent-lab-attack-target-third",
          top: { card: "BT1-011", as: "opponent-card-lab-attack-target-third-card" },
          dp: 1000,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "opponent-source-lab-attack-target-third-0-card" }],
        },
        {
          card: "BT1-011",
          as: "opponent-lab-attack-target-fourth",
          top: { card: "BT1-011", as: "opponent-card-lab-attack-target-fourth-card" },
          dp: 1000,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "opponent-source-lab-attack-target-fourth-0-card" }],
        },
        {
          card: "BT1-011",
          as: "opponent-lab-attack-target-fifth",
          top: { card: "BT1-011", as: "opponent-card-lab-attack-target-fifth-card" },
          dp: 1000,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "opponent-source-lab-attack-target-fifth-0-card" }],
        },
        {
          card: "BT25-016",
          as: "opponent-lab-attack-watcher",
          top: { card: "BT25-016", as: "opponent-card-lab-attack-watcher-card" },
          dp: 7000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
