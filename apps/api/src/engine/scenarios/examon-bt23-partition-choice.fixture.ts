import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "examon-bt23-partition-choice",
  board: {
    "0": {
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
        { card: "BT1-009", as: "examon-bt23-partition-choice-0-security-0-card" },
        { card: "BT1-009", as: "examon-bt23-partition-choice-0-security-1-card" },
        { card: "BT1-009", as: "examon-bt23-partition-choice-0-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT23-047",
          as: "examon-bt23-partition-choice-0-field-0",
          top: { card: "BT23-047", as: "examon-bt23-partition-choice-0-field-0-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "EX13-005", as: "examon-bt23-partition-choice-0-source-0-0-card" },
            { card: "BT20-007", as: "examon-bt23-partition-choice-0-source-0-1-card" },
            { card: "BT21-046", as: "examon-bt23-partition-choice-0-source-0-2-card" },
            { card: "EX13-018", as: "examon-bt23-partition-choice-0-source-0-3-card" },
            { card: "EX13-021", as: "examon-bt23-partition-choice-0-source-0-4-card" },
            { card: "BT20-042", as: "examon-bt23-partition-choice-0-source-0-5-card" },
          ],
        },
      ],
    },
    "1": {
      hand: [{ card: "AD1-024", as: "examon-bt23-partition-choice-1-hand-0-card", faceUp: false }],
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
        { card: "BT1-009", as: "examon-bt23-partition-choice-1-security-0-card" },
        { card: "BT1-009", as: "examon-bt23-partition-choice-1-security-1-card" },
        { card: "BT1-009", as: "examon-bt23-partition-choice-1-security-2-card" },
      ],
      battleArea: [
        {
          card: "AD1-011",
          as: "examon-bt23-partition-choice-1-field-0",
          top: { card: "AD1-011", as: "examon-bt23-partition-choice-1-field-0-card" },
          dp: 8000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  presentation: {
    opponent: {
      endBreeding: true,
      fallbackMain: "end",
      main: [{ kind: "digivolve", card: "AD1-024", base: "AD1-011" }],
      decisions: [
        { sourceCard: "AD1-024", timing: "AllTurns", kind: "optional", accept: false },
        { sourceCard: "AD1-024", timing: "AllTurns", kind: "orderTriggers", accept: false },
      ],
    },
  },
};

export default fixture;
