import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "deramon-breeding-level",
  board: {
    "0": {
      hand: [{ card: "BT21-038", as: "deramon-card" }],
      deck: [
        { card: "BT1-009", as: "deck-0-0-card" },
        { card: "BT1-009", as: "deck-0-1-card" },
        { card: "BT1-009", as: "deck-0-2-card" },
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
        { card: "BT1-010", as: "security-0-0-card" },
        { card: "BT1-010", as: "security-0-1-card" },
        { card: "BT1-010", as: "security-0-2-card" },
        { card: "BT1-010", as: "security-0-3-card" },
      ],
      battleArea: [
        {
          card: "EX9-040",
          as: "own-parasaurmon",
          top: { card: "EX9-040", as: "own-card-parasaurmon-card" },
          dp: 5000,
          placedByEffect: false,
        },
      ],
      breeding: {
        card: "EX9-036",
        as: "own-pomumon",
        top: { card: "EX9-036", as: "own-card-pomumon-card" },
        dp: 1000,
        placedByEffect: false,
        under: [{ card: "BT21-003", as: "own-source-pomumon-0-card" }],
      },
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "deck-1-0-card" },
        { card: "BT1-009", as: "deck-1-1-card" },
        { card: "BT1-009", as: "deck-1-2-card" },
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
        { card: "BT1-010", as: "security-1-0-card" },
        { card: "BT1-010", as: "security-1-1-card" },
        { card: "BT1-010", as: "security-1-2-card" },
        { card: "BT1-010", as: "security-1-3-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
