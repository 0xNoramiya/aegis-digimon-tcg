import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt26-cerberusmon-breeding-arts",
  board: {
    "0": {
      hand: [
        { card: "BT26-056", as: "cerberus-option-card", faceUp: false },
        { card: "BT1-010", as: "cerberus-discard-card", faceUp: false },
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
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      breeding: {
        card: "EX13-051",
        as: "own-cerberus-guardromon",
        top: { card: "EX13-051", as: "own-card-cerberus-guardromon-card" },
        dp: 5000,
        placedByEffect: false,
        under: [{ card: "BT1-001", as: "own-source-cerberus-guardromon-0-card" }],
      },
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
          card: "BT26-060",
          as: "opponent-cerberus-target",
          top: { card: "BT26-060", as: "opponent-card-cerberus-target-card" },
          dp: 16000,
          placedByEffect: false,
          under: [
            { card: "BT24-034", as: "opponent-source-cerberus-target-0-card" },
            { card: "BT26-015", as: "opponent-source-cerberus-target-1-card" },
            { card: "BT26-016", as: "opponent-source-cerberus-target-2-card" },
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
