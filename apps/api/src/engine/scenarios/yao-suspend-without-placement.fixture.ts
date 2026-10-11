import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "yao-suspend-without-placement",
  board: {
    "0": {
      hand: [{ card: "BT22-027", as: "yao-suspend-without-placement-0-hand-0-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-0-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-1-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-2-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-3-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-4-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-5-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-6-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-7-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-8-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-9-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-10-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "yao-suspend-without-placement-0-security-0-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-security-1-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-0-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT22-096",
          as: "yao-suspend-without-placement-0-field-0",
          top: { card: "BT22-096", as: "yao-suspend-without-placement-0-field-0-card" },
          dp: 0,
          enterFieldTurnCount: -1,
          placedByEffect: true,
        },
        {
          card: "BT19-082",
          as: "yao-suspend-without-placement-0-field-1",
          top: { card: "BT19-082", as: "yao-suspend-without-placement-0-field-1-card" },
          dp: 0,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT24-029",
          as: "yao-suspend-without-placement-0-field-2",
          top: { card: "BT24-029", as: "yao-suspend-without-placement-0-field-2-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-0-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-1-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-2-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-3-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-4-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-5-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-6-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-7-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-8-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-9-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-10-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "yao-suspend-without-placement-1-security-0-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-security-1-card" },
        { card: "BT1-009", as: "yao-suspend-without-placement-1-security-2-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
