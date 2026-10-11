import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "security-chain",
  board: {
    "0": {
      hand: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [13, 38, 45, 10, 42] }),
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          4, 43, 9, 22, 17, 26, 12, 47, 34, 5, 11, 30, 35, 48, 25, 0, 27, 44, 29, 40, 7, 32, 19, 2, 41, 46, 14, 16, 36,
          39, 23, 28, 49, 3, 6, 37, 18, 33, 24, 21,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "EX12-076", as: "security-0-card" },
        { card: "BT1-032", as: "own-deck-slot-20-card", artId: "BT1-032", fromDeck: { seat: 0, index: 20 } },
        { card: "BT1-027", as: "own-deck-slot-1-card", artId: "BT1-027", fromDeck: { seat: 0, index: 1 } },
        { card: "BT1-030", as: "own-deck-slot-15-card", artId: "BT1-030", fromDeck: { seat: 0, index: 15 } },
        { card: "BT1-034", as: "own-deck-slot-31-card", artId: "BT1-034", fromDeck: { seat: 0, index: 31 } },
      ],
    },
    "1": {
      hand: dealtCards({ deck: RED_DECK, seat: 1, indices: [49, 14, 42, 9, 33] }),
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          18, 39, 24, 17, 26, 43, 47, 25, 19, 8, 3, 27, 36, 10, 37, 4, 11, 1, 31, 38, 7, 6, 15, 29, 35, 28, 41, 5, 48,
          13, 2, 46, 0, 32, 23, 30, 20, 16, 12, 40,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [34, 21, 44, 45, 22] }),
      battleArea: [
        {
          card: "AD1-013",
          as: "opponent",
          top: { card: "AD1-013", as: "opponent-card-card" },
          dp: 11000,
          placedByEffect: false,
          under: [
            { card: "BT10-003", as: "opponent-source-0-card" },
            { card: "BT19-008", as: "opponent-source-1-card" },
            { card: "BT21-021", as: "opponent-source-2-card" },
          ],
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
