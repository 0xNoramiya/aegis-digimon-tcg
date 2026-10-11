import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "larva-immunity",
  board: {
    "0": {
      hand: [{ card: "AD1-018", as: "open-bugs-lord-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "open-bugs-deck-0-0-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-1-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-2-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-3-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-4-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-5-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-6-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-7-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-8-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-9-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-10-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-11-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-12-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-13-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-14-card" },
        { card: "BT1-009", as: "open-bugs-deck-0-15-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "open-bugs-security-0-0-card" },
        { card: "BT1-009", as: "open-bugs-security-0-1-card" },
        { card: "BT1-009", as: "open-bugs-security-0-2-card" },
        { card: "BT1-009", as: "open-bugs-security-0-3-card" },
        { card: "BT1-009", as: "open-bugs-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT18-086",
          as: "own-open-bugs-larva",
          top: { card: "BT18-086", as: "own-card-open-bugs-larva-card" },
          dp: 0,
          placedByEffect: false,
          suspended: true,
        },
        {
          card: "EX6-054",
          as: "own-open-bugs-lucemon",
          top: { card: "EX6-054", as: "own-card-open-bugs-lucemon-card" },
          dp: 13000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [{ card: "EX5-041", as: "open-bugs-second-ebon-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "open-bugs-deck-1-0-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-1-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-2-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-3-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-4-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-5-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-6-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-7-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-8-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-9-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-10-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-11-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-12-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-13-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-14-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-15-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "open-bugs-security-1-0-card" },
        { card: "BT1-009", as: "open-bugs-security-1-1-card" },
        { card: "BT1-009", as: "open-bugs-security-1-2-card" },
        { card: "BT1-009", as: "open-bugs-security-1-3-card" },
        { card: "BT1-009", as: "open-bugs-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "EX5-041",
          as: "opponent-open-bugs-ebon",
          top: { card: "EX5-041", as: "opponent-card-open-bugs-ebon-card" },
          dp: 12000,
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
