import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "craniamon-guardromon",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-0-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-1-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-2-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-3-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-4-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-5-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-6-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-7-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-8-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-9-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-10-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "craniamon-guardromon-0-security-0-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-security-1-card" },
        { card: "BT1-009", as: "craniamon-guardromon-0-security-2-card" },
      ],
      battleArea: [
        {
          card: "EX13-062",
          as: "craniamon-guardromon-0-field-0",
          top: { card: "EX13-062", as: "craniamon-guardromon-0-field-0-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "P-144", as: "craniamon-guardromon-0-source-0-0-card" },
            { card: "EX13-051", as: "craniamon-guardromon-0-source-0-1-card" },
          ],
        },
      ],
    },
    "1": {
      hand: [{ card: "BT25-016", as: "craniamon-guardromon-1-hand-0-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-0-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-1-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-2-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-3-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-4-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-5-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-6-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-7-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-8-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-9-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-10-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "craniamon-guardromon-1-security-0-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-security-1-card" },
        { card: "BT1-009", as: "craniamon-guardromon-1-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT4-065",
          as: "craniamon-guardromon-1-field-0",
          top: { card: "BT4-065", as: "craniamon-guardromon-1-field-0-card" },
          dp: 6000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "craniamon-guardromon-1-field-1",
          top: { card: "BT1-009", as: "craniamon-guardromon-1-field-1-card" },
          dp: 3000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
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
