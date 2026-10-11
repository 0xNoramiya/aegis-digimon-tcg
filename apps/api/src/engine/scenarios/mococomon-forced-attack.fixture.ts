import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "mococomon-forced-attack",
  board: {
    "0": {
      hand: [
        { card: "EX12-045", as: "mococomon-forced-attack-0-hand-0-card", faceUp: false },
        { card: "EX12-056", as: "mococomon-forced-attack-0-hand-1-card", faceUp: false },
        { card: "EX12-034", as: "mococomon-forced-attack-0-hand-2-card", faceUp: false },
        { card: "EX12-076", as: "mococomon-forced-attack-0-hand-3-card", faceUp: false },
      ],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-010", as: "mococomon-forced-attack-0-security-0-card" },
        { card: "BT1-010", as: "mococomon-forced-attack-0-security-1-card" },
        { card: "BT1-010", as: "mococomon-forced-attack-0-security-2-card" },
      ],
      battleArea: [
        {
          card: "EX12-043",
          as: "mococomon-forced-attack-0-field-0",
          top: { card: "EX12-043", as: "mococomon-forced-attack-0-field-0-card" },
          dp: 6000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "EX12-002", as: "mococomon-forced-attack-0-source-0-0-card" }],
        },
      ],
    },
    "1": {
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-010", as: "mococomon-forced-attack-1-security-0-card" },
        { card: "BT1-010", as: "mococomon-forced-attack-1-security-1-card" },
        { card: "BT1-010", as: "mococomon-forced-attack-1-security-2-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
