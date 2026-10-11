import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ui-ex11-cool-boy-hand-selection",
  board: {
    "0": {
      hand: [
        { card: "BT20-050", as: "ui-ex11-cool-boy-first-card", faceUp: false },
        { card: "BT20-050", as: "ui-ex11-cool-boy-second-card", faceUp: false },
        { card: "EX11-071", as: "ui-ex11-cool-boy-witness-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "ui-cool-boy-deck-0-0-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-1-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-2-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-3-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-4-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-5-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-6-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-7-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-8-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-9-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-10-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-11-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-12-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-13-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-14-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-15-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-16-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-17-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-18-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-0-19-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "EX11-071",
          as: "own-ui-ex11-cool-boy",
          top: { card: "EX11-071", as: "own-card-ui-ex11-cool-boy-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "ui-cool-boy-deck-1-0-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-1-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-2-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-3-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-4-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-5-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-6-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-7-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-8-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-9-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-10-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-11-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-12-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-13-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-14-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-15-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-16-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-17-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-18-card" },
        { card: "BT1-009", as: "ui-cool-boy-deck-1-19-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [33, 9, 42, 14, 49] }),
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
