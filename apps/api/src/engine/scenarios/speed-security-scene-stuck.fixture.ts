import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "speed-security-scene-stuck",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "speed-deck-0-0-card" },
        { card: "BT1-009", as: "speed-deck-0-1-card" },
        { card: "BT1-009", as: "speed-deck-0-2-card" },
        { card: "BT1-009", as: "speed-deck-0-3-card" },
        { card: "BT1-009", as: "speed-deck-0-4-card" },
        { card: "BT1-009", as: "speed-deck-0-5-card" },
        { card: "BT1-009", as: "speed-deck-0-6-card" },
        { card: "BT1-009", as: "speed-deck-0-7-card" },
        { card: "BT1-009", as: "speed-deck-0-8-card" },
        { card: "BT1-009", as: "speed-deck-0-9-card" },
        { card: "BT1-009", as: "speed-deck-0-10-card" },
        { card: "BT1-009", as: "speed-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "speed-egg-0-card" }],
      security: [
        { card: "BT23-054", as: "speed-magnamon-card" },
        { card: "BT1-009", as: "speed-security-0-0-card" },
        { card: "BT1-009", as: "speed-security-0-1-card" },
      ],
      battleArea: [
        {
          card: "AD1-017",
          as: "own-speed-dynasmon",
          top: { card: "AD1-017", as: "own-card-speed-dynasmon-card" },
          dp: 11000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "speed-deck-1-0-card" },
        { card: "BT1-009", as: "speed-deck-1-1-card" },
        { card: "BT1-009", as: "speed-deck-1-2-card" },
        { card: "BT1-009", as: "speed-deck-1-3-card" },
        { card: "BT1-009", as: "speed-deck-1-4-card" },
        { card: "BT1-009", as: "speed-deck-1-5-card" },
        { card: "BT1-009", as: "speed-deck-1-6-card" },
        { card: "BT1-009", as: "speed-deck-1-7-card" },
        { card: "BT1-009", as: "speed-deck-1-8-card" },
        { card: "BT1-009", as: "speed-deck-1-9-card" },
        { card: "BT1-009", as: "speed-deck-1-10-card" },
        { card: "BT1-009", as: "speed-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "speed-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "speed-security-1-0-card" },
        { card: "BT1-009", as: "speed-security-1-1-card" },
        { card: "BT1-009", as: "speed-security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "opponent-speed-monodramon",
          top: { card: "BT1-009", as: "opponent-card-speed-monodramon-card" },
          dp: 3000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  presentation: { timed: true },
};

export default fixture;
