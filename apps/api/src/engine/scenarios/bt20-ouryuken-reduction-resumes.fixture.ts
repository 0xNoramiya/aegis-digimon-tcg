import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt20-ouryuken-reduction-resumes",
  board: {
    "0": {
      hand: [{ card: "BT20-060", as: "ouryuken-card", faceUp: false }],
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
          card: "BT13-110",
          as: "own-ouryuken-royal-purge",
          top: { card: "BT13-110", as: "own-card-ouryuken-royal-purge-card" },
          dp: 0,
          placedByEffect: true,
        },
      ],
      breeding: {
        card: "BT13-007",
        as: "own-ouryuken-king-drasil",
        top: { card: "BT13-007", as: "own-card-ouryuken-king-drasil-card" },
        dp: 0,
        placedByEffect: false,
        under: [
          { card: "BT20-060", as: "own-source-ouryuken-king-drasil-0-card" },
          { card: "BT13-007", as: "own-source-ouryuken-king-drasil-1-card" },
          { card: "BT13-007", as: "own-source-ouryuken-king-drasil-2-card" },
          { card: "BT13-007", as: "own-source-ouryuken-king-drasil-3-card" },
          { card: "BT13-007", as: "own-source-ouryuken-king-drasil-4-card" },
        ],
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
          card: "BT26-016",
          as: "opponent-ouryuken-chronomon",
          top: { card: "BT26-016", as: "opponent-card-ouryuken-chronomon-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "BT26-029", as: "opponent-source-ouryuken-chronomon-0-card" }],
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  effects: [{ permanent: "opponent-ouryuken-chronomon", kind: "holyProtection" }],
};

export default fixture;
