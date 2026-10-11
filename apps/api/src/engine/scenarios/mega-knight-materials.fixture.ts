import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "mega-knight-materials",
  board: {
    "0": {
      hand: [
        { card: "EX13-016", as: "open-bugs-omnimon-card", faceUp: false },
        { card: "BT22-017", as: "open-bugs-wrong-card", faceUp: false },
        { card: "BT22-013", as: "open-bugs-war-a-card", faceUp: false },
        { card: "BT17-015", as: "open-bugs-war-b-card", faceUp: false },
        { card: "P-220", as: "open-bugs-millennium-card", faceUp: false },
      ],
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
          card: "BT22-026",
          as: "own-open-bugs-metal",
          top: { card: "BT22-026", as: "own-card-open-bugs-metal-card" },
          dp: 12000,
          placedByEffect: false,
        },
        {
          card: "BT17-095",
          as: "own-open-bugs-delay-a",
          top: { card: "BT17-095", as: "own-card-open-bugs-delay-a-card" },
          dp: 0,
          placedByEffect: true,
        },
        {
          card: "BT17-095",
          as: "own-open-bugs-delay-b",
          top: { card: "BT17-095", as: "own-card-open-bugs-delay-b-card" },
          dp: 0,
          placedByEffect: true,
        },
      ],
    },
    "1": {
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
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
