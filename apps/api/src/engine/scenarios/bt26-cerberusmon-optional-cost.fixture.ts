import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt26-cerberusmon-optional-cost",
  board: {
    "0": {
      hand: [
        { card: "BT26-074", as: "bt26-cerberusmon-card", faceUp: false },
        { card: "BT1-010", as: "cerberusmon-hand-cost-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "cerberusmon-deck-0-0-card" },
        { card: "BT1-009", as: "cerberusmon-deck-0-1-card" },
        { card: "BT1-009", as: "cerberusmon-deck-0-2-card" },
        { card: "BT1-009", as: "cerberusmon-deck-0-3-card" },
        { card: "BT1-009", as: "cerberusmon-deck-0-4-card" },
        { card: "BT1-009", as: "cerberusmon-deck-0-5-card" },
        { card: "BT1-009", as: "cerberusmon-deck-0-6-card" },
        { card: "BT1-009", as: "cerberusmon-deck-0-7-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      trash: [{ card: "BT26-056", as: "cerberusmon-titan-option-card" }],
      security: [
        { card: "BT1-009", as: "cerberusmon-security-0-0-card" },
        { card: "BT1-009", as: "cerberusmon-security-0-1-card" },
        { card: "BT1-009", as: "cerberusmon-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT26-038",
          as: "own-cerberusmon-base",
          top: { card: "BT26-038", as: "own-card-cerberusmon-base-card" },
          dp: 5000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "cerberusmon-deck-1-0-card" },
        { card: "BT1-009", as: "cerberusmon-deck-1-1-card" },
        { card: "BT1-009", as: "cerberusmon-deck-1-2-card" },
        { card: "BT1-009", as: "cerberusmon-deck-1-3-card" },
        { card: "BT1-009", as: "cerberusmon-deck-1-4-card" },
        { card: "BT1-009", as: "cerberusmon-deck-1-5-card" },
        { card: "BT1-009", as: "cerberusmon-deck-1-6-card" },
        { card: "BT1-009", as: "cerberusmon-deck-1-7-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "cerberusmon-security-1-0-card" },
        { card: "BT1-009", as: "cerberusmon-security-1-1-card" },
        { card: "BT1-009", as: "cerberusmon-security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-019",
          as: "opponent-cerberusmon-target",
          top: { card: "BT1-019", as: "opponent-card-cerberusmon-target-card" },
          dp: 6000,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "opponent-source-cerberusmon-target-0-card" }],
        },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
