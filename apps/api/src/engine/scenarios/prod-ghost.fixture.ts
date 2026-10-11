import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "prod-ghost",
  board: {
    "0": {
      hand: [
        { card: "BT20-079", as: "lab-ghost-necromon-card", faceUp: false },
        { card: "BT20-063", as: "lab-ghost-discard-card", faceUp: false },
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
      trash: [{ card: "BT20-068", as: "lab-ghost-bakemon-card" }],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "BT20-072",
          as: "own-lab-ghost-phantomon",
          top: { card: "BT20-072", as: "own-card-lab-ghost-phantomon-card" },
          dp: 7000,
          placedByEffect: false,
        },
        {
          card: "EX11-068",
          as: "own-lab-ghost-violet-inboots",
          top: { card: "EX11-068", as: "own-card-lab-ghost-violet-inboots-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT23-098",
          as: "own-lab-ghost-soul-banquet",
          top: { card: "BT23-098", as: "own-card-lab-ghost-soul-banquet-card" },
          dp: 0,
          placedByEffect: true,
        },
      ],
    },
    "1": {
      hand: [{ card: "EX12-006", as: "lab-ghost-bot-kakamon-card", faceUp: false }],
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
        { card: "BT26-104", as: "lab-security-1-0-card" },
        { card: "BT1-020", as: "opponent-deck-slot-33-card", artId: "BT1-020", fromDeck: { seat: 1, index: 33 } },
        { card: "BT1-011", as: "opponent-deck-slot-9-card", artId: "BT1-011", fromDeck: { seat: 1, index: 9 } },
        { card: "BT1-017", as: "opponent-deck-slot-42-card", artId: "BT1-017", fromDeck: { seat: 1, index: 42 } },
        { card: "BT1-012", as: "opponent-deck-slot-14-card", artId: "BT1-012", fromDeck: { seat: 1, index: 14 } },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
