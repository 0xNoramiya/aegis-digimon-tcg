import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "prod-ghost-execute",
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
      trash: [{ card: "BT20-063", as: "lab-execute-ghostmon-card" }],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "EX11-051",
          as: "own-lab-execute-ghoulmon",
          top: { card: "EX11-051", as: "own-card-lab-execute-ghoulmon-card" },
          dp: 12000,
          placedByEffect: false,
          under: [
            { card: "BT20-006", as: "own-source-lab-execute-ghoulmon-0-card" },
            { card: "BT20-063", as: "own-source-lab-execute-ghoulmon-1-card" },
            { card: "BT20-068", as: "own-source-lab-execute-ghoulmon-2-card" },
            { card: "BT23-065", as: "own-source-lab-execute-ghoulmon-3-card" },
            { card: "BT20-006", as: "own-source-lab-execute-ghoulmon-4-card" },
          ],
        },
        {
          card: "EX11-068",
          as: "own-lab-execute-violet-inboots",
          top: { card: "EX11-068", as: "own-card-lab-execute-violet-inboots-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT20-088",
          as: "own-lab-execute-tamer",
          top: { card: "BT20-088", as: "own-card-lab-execute-tamer-card" },
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
          card: "BT1-009",
          as: "opponent-lab-execute-target",
          top: { card: "BT1-009", as: "opponent-card-lab-execute-target-card" },
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
