import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt26-chronomon-dm-succession",
  board: {
    "0": {
      hand: [
        { card: "BT26-060", as: "bt26-destroy-mode-card", faceUp: false },
        { card: "BT26-060", as: "bt26-destroy-mode-2-card", faceUp: false },
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
        { card: "BT1-009", as: "bt26-recovery-cost-1-card" },
        { card: "BT1-009", as: "bt26-recovery-cost-2-card" },
        { card: "BT1-009", as: "bt26-recovery-cost-3-card" },
      ],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "BT26-016",
          as: "own-bt26-holy-mode",
          top: { card: "BT26-016", as: "own-card-bt26-holy-mode-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "BT26-073", as: "own-source-bt26-holy-mode-0-card" }],
        },
        {
          card: "BT26-085",
          as: "own-bt26-giant-slayer",
          top: { card: "BT26-085", as: "own-card-bt26-giant-slayer-card" },
          dp: 14000,
          placedByEffect: false,
          under: [{ card: "BT26-016", as: "own-source-bt26-giant-slayer-0-card" }],
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
          card: "BT1-080",
          as: "opponent-bt26-battle-winner",
          top: { card: "BT1-080", as: "opponent-card-bt26-battle-winner-card" },
          dp: 16000,
          placedByEffect: false,
          suspended: true,
          under: [
            { card: "BT1-009", as: "opponent-source-bt26-battle-winner-0-card" },
            { card: "BT1-015", as: "opponent-source-bt26-battle-winner-1-card" },
          ],
        },
      ],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
