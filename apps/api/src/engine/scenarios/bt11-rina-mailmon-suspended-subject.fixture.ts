import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt11-rina-mailmon-suspended-subject",
  board: {
    "0": {
      hand: [{ card: "BT26-019", as: "rina-mailmon-link-card" }],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          13, 38, 45, 10, 42, 8, 31, 15, 1, 20, 4, 43, 9, 22, 17, 26, 12, 47, 34, 5, 11, 30, 35, 48, 25, 0, 27, 44, 29,
          40, 7, 32, 19, 2, 41, 46, 14, 16, 36, 39, 23, 28, 49, 3, 6, 37, 18, 33, 24, 21,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [{ card: "BT1-009", as: "rina-mailmon-security-0-card" }],
      battleArea: [
        {
          card: "BT21-009",
          as: "own-rina-mailmon-host",
          top: { card: "BT21-009", as: "own-card-rina-mailmon-host-card" },
          dp: 2000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          49, 14, 42, 9, 33, 22, 45, 44, 21, 34, 18, 39, 24, 17, 26, 43, 47, 25, 19, 8, 3, 27, 36, 10, 37, 4, 11, 1, 31,
          38, 7, 6, 15, 29, 35, 28, 41, 5, 48, 13, 2, 46, 0, 32, 23, 30, 20, 16, 12, 40,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: [{ card: "BT1-009", as: "rina-mailmon-security-1-card" }],
      battleArea: [
        {
          card: "BT11-112",
          as: "opponent-rina-mailmon-tamer",
          top: { card: "BT11-112", as: "opponent-card-rina-mailmon-tamer-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "EX13-023",
          as: "opponent-rina-mailmon-ulforce",
          top: { card: "EX13-023", as: "opponent-card-rina-mailmon-ulforce-card" },
          dp: 12000,
          placedByEffect: false,
        },
        {
          card: "EX13-019",
          as: "opponent-rina-mailmon-veedramon",
          top: { card: "EX13-019", as: "opponent-card-rina-mailmon-veedramon-card" },
          dp: 6000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 6,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
