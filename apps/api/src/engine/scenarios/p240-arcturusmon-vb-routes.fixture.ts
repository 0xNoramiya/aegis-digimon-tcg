import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "p240-arcturusmon-vb-routes",
  board: {
    "0": {
      hand: [
        { card: "P-240", as: "arcturusmon-digivolve-card", faceUp: false },
        { card: "P-240", as: "arcturusmon-assembly-card", faceUp: false },
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
        { card: "EX12-014", as: "arcturusmon-material-5-card" },
        { card: "BT10-050", as: "arcturusmon-material-4-card" },
        { card: "EX12-021", as: "arcturusmon-material-3-card" },
      ],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "EX12-014",
          as: "own-arcturusmon-vb-base",
          top: { card: "EX12-014", as: "own-card-arcturusmon-vb-base-card" },
          dp: 7000,
          placedByEffect: false,
          under: [
            { card: "EX12-007", as: "own-source-arcturusmon-vb-base-0-card" },
            { card: "EX12-013", as: "own-source-arcturusmon-vb-base-1-card" },
          ],
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
          card: "BT1-020",
          as: "opponent-arcturusmon-target",
          top: { card: "BT1-020", as: "opponent-card-arcturusmon-target-card" },
          dp: 6000,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "opponent-source-arcturusmon-target-0-card" }],
        },
      ],
    },
  },
  memory: 11,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  allowOutOfRangeMemory: true,
};

export default fixture;
