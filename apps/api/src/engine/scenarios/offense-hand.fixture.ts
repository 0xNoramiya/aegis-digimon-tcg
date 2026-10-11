import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "offense-hand",
  board: {
    "0": {
      hand: [
        { card: "BT1-016", as: "own-deck-slot-22-card" },
        { card: "BT1-016", as: "own-deck-slot-20-card" },
        { card: "BT1-021", as: "own-deck-slot-21-card" },
        { card: "BT1-037", as: "own-deck-slot-23-card" },
        { card: "P-103", as: "own-deck-slot-24-card" },
      ],
      deck: [
        { card: "BT1-009", as: "deck-0-0-card" },
        { card: "BT1-015", as: "deck-0-1-card" },
        { card: "BT1-037", as: "deck-0-2-card" },
        { card: "BT1-009", as: "deck-0-3-card" },
        { card: "BT1-009", as: "deck-0-4-card" },
        { card: "BT1-009", as: "deck-0-5-card" },
        { card: "BT1-009", as: "deck-0-6-card" },
        { card: "BT1-009", as: "deck-0-7-card" },
        { card: "BT1-009", as: "deck-0-8-card" },
        { card: "BT1-009", as: "deck-0-9-card" },
        { card: "BT1-009", as: "deck-0-10-card" },
        { card: "BT1-009", as: "deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
        { card: "BT1-009", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "own-host",
          top: { card: "BT1-009", as: "own-card-host-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "P-103",
          as: "own-delay",
          top: { card: "P-103", as: "own-card-delay-card" },
          dp: 0,
          placedByEffect: true,
        },
      ],
    },
    "1": {
      hand: [{ card: "BT21-019", as: "opponent-deck-slot-22-card" }],
      deck: [
        { card: "BT1-009", as: "deck-1-0-card" },
        { card: "BT1-015", as: "deck-1-1-card" },
        { card: "BT1-037", as: "deck-1-2-card" },
        { card: "BT1-009", as: "deck-1-3-card" },
        { card: "BT1-009", as: "deck-1-4-card" },
        { card: "BT1-009", as: "deck-1-5-card" },
        { card: "BT1-009", as: "deck-1-6-card" },
        { card: "BT1-009", as: "deck-1-7-card" },
        { card: "BT1-009", as: "deck-1-8-card" },
        { card: "BT1-009", as: "deck-1-9-card" },
        { card: "BT1-009", as: "deck-1-10-card" },
        { card: "BT1-009", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
        { card: "BT1-009", as: "security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT21-019",
          as: "opponent-opponent",
          top: { card: "BT21-019", as: "opponent-card-opponent-card" },
          dp: 6000,
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
