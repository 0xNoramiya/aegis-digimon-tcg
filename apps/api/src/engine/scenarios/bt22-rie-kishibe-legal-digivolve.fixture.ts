import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt22-rie-kishibe-legal-digivolve",
  board: {
    "0": {
      hand: [{ card: "EX13-064", as: "rie-legal-lordknightmon-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "rie-legal-deck-0-0-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-1-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-2-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-3-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-4-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-5-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-6-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-7-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-8-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-9-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-10-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-11-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-12-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-13-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-14-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-15-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-16-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-17-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-18-card" },
        { card: "BT1-009", as: "rie-legal-deck-0-19-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "rie-legal-security-0-0-card" },
        { card: "BT1-009", as: "rie-legal-security-0-1-card" },
        { card: "BT1-009", as: "rie-legal-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT22-090",
          as: "own-rie-legal-base",
          top: { card: "BT22-090", as: "own-card-rie-legal-base-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT22-083",
          as: "own-rie-legal-payment",
          top: { card: "BT22-083", as: "own-card-rie-legal-payment-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "rie-legal-deck-1-0-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-1-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-2-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-3-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-4-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-5-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-6-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-7-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-8-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-9-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-10-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-11-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-12-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-13-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-14-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-15-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-16-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-17-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-18-card" },
        { card: "BT1-009", as: "rie-legal-deck-1-19-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "rie-legal-security-1-0-card" },
        { card: "BT1-009", as: "rie-legal-security-1-1-card" },
        { card: "BT1-009", as: "rie-legal-security-1-2-card" },
        { card: "BT1-009", as: "rie-legal-security-1-3-card" },
        { card: "BT1-009", as: "rie-legal-security-1-4-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
