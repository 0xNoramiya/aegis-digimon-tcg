import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "dantemon-attack-links",
  board: {
    "0": {
      hand: [
        { card: "BT26-102", as: "dantemon-attack-links-0-hand-0-card", faceUp: false },
        { card: "BT26-086", as: "dantemon-attack-links-0-hand-1-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "dantemon-attack-links-0-deck-0-card" },
        { card: "BT1-009", as: "dantemon-attack-links-0-deck-1-card" },
        { card: "BT1-009", as: "dantemon-attack-links-0-deck-2-card" },
        { card: "BT1-009", as: "dantemon-attack-links-0-deck-3-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      trash: [
        { card: "BT26-010", as: "dantemon-attack-links-0-trash-0-card" },
        { card: "BT26-084", as: "dantemon-attack-links-0-trash-1-card" },
        { card: "BT26-037", as: "dantemon-attack-links-0-trash-2-card" },
        { card: "BT26-019", as: "dantemon-attack-links-0-trash-3-card" },
        { card: "BT26-051", as: "dantemon-attack-links-0-trash-4-card" },
        { card: "BT26-028", as: "dantemon-attack-links-0-trash-5-card" },
      ],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "BT26-063",
          as: "dantemon-attack-links-0-field-0",
          top: { card: "BT26-063", as: "dantemon-attack-links-0-field-0-card" },
          dp: 4000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "dantemon-attack-links-1-deck-0-card" },
        { card: "BT1-009", as: "dantemon-attack-links-1-deck-1-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT21-072", as: "dantemon-attack-links-1-security-0-card" },
        { card: "BT1-090", as: "dantemon-attack-links-1-security-1-card" },
        { card: "P-108", as: "dantemon-attack-links-1-security-2-card" },
        { card: "BT7-107", as: "dantemon-attack-links-1-security-3-card" },
      ],
      battleArea: [
        {
          card: "EX5-063",
          as: "dantemon-attack-links-1-field-0",
          top: { card: "EX5-063", as: "dantemon-attack-links-1-field-0-card" },
          dp: 13000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          suspended: true,
          under: [{ card: "BT16-075", as: "dantemon-attack-links-1-source-0-0-card" }],
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
