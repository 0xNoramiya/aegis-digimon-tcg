import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ravemon-burst-hand",
  board: {
    "0": {
      hand: [{ card: "BT13-092", as: "ravemon-burst-card-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "ravemon-burst-deck-0-0-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-1-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-2-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-3-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-4-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-5-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-6-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-7-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-8-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-9-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-10-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-11-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-12-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-13-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-14-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-15-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-16-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-17-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-18-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-0-19-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "ST1-07", as: "ravemon-burst-security-0-0-card" },
        { card: "BT1-010", as: "ravemon-burst-security-0-1-card" },
      ],
      battleArea: [
        {
          card: "BT13-089",
          as: "own-ravemon-burst-host",
          top: { card: "BT13-089", as: "own-card-ravemon-burst-host-card" },
          dp: 12000,
          placedByEffect: false,
        },
        {
          card: "BT13-102",
          as: "own-ravemon-burst-keenan",
          top: { card: "BT13-102", as: "own-card-ravemon-burst-keenan-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [
        { card: "BT1-009", as: "ravemon-burst-hand-first-card", faceUp: false },
        { card: "BT1-010", as: "ravemon-burst-hand-second-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "ravemon-burst-deck-1-0-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-1-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-2-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-3-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-4-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-5-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-6-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-7-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-8-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-9-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-10-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-11-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-12-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-13-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-14-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-15-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-16-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-17-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-18-card" },
        { card: "BT1-009", as: "ravemon-burst-deck-1-19-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "ST1-07", as: "ravemon-burst-security-1-0-card" },
        { card: "BT1-010", as: "ravemon-burst-security-1-1-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
