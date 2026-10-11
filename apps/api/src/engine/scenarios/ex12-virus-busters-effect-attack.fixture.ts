import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ex12-virus-busters-effect-attack",
  board: {
    "0": {
      hand: [
        { card: "EX12-032", as: "virus-busters-weregarurumon-card", faceUp: false },
        { card: "EX12-016", as: "virus-busters-same-level-card", faceUp: false },
        { card: "EX12-017", as: "virus-busters-after-digivolve-card", faceUp: false },
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
      trash: [{ card: "EX12-035", as: "virus-busters-metalgarurumon-card" }],
      security: [
        { card: "BT1-086", as: "own-deck-slot-42-card", artId: "BT1-086", fromDeck: { seat: 0, index: 42 } },
        { card: "BT1-029", as: "own-deck-slot-10-card", artId: "BT1-029", fromDeck: { seat: 0, index: 10 } },
        { card: "BT1-086", as: "own-deck-slot-45-card", artId: "BT1-086", fromDeck: { seat: 0, index: 45 } },
        { card: "BT1-039", as: "own-deck-slot-38-card", artId: "BT1-039", fromDeck: { seat: 0, index: 38 } },
        { card: "BT1-030", as: "own-deck-slot-13-card", artId: "BT1-030", fromDeck: { seat: 0, index: 13 } },
        { card: "EX12-069", as: "virus-busters-security-card", faceUp: true },
      ],
      battleArea: [
        {
          card: "EX12-013",
          as: "own-virus-busters-nyaromon",
          top: { card: "EX12-013", as: "own-card-virus-busters-nyaromon-card" },
          dp: 6000,
          placedByEffect: false,
          under: [{ card: "EX12-001", as: "own-source-virus-busters-nyaromon-0-card" }],
        },
        {
          card: "EX12-024",
          as: "own-virus-busters-partner",
          top: { card: "EX12-024", as: "own-card-virus-busters-partner-card" },
          dp: 4000,
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
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
