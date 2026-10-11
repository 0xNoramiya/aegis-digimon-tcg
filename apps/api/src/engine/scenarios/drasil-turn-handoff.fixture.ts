import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "drasil-turn-handoff",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "drasil-deck-0-0-card" },
        { card: "BT1-009", as: "drasil-deck-0-1-card" },
        { card: "BT1-009", as: "drasil-deck-0-2-card" },
        { card: "BT1-009", as: "drasil-deck-0-3-card" },
        { card: "BT1-009", as: "drasil-deck-0-4-card" },
        { card: "BT1-009", as: "drasil-deck-0-5-card" },
        { card: "BT1-009", as: "drasil-deck-0-6-card" },
        { card: "BT1-009", as: "drasil-deck-0-7-card" },
        { card: "BT1-009", as: "drasil-deck-0-8-card" },
        { card: "BT1-009", as: "drasil-deck-0-9-card" },
        { card: "BT1-009", as: "drasil-deck-0-10-card" },
        { card: "BT1-009", as: "drasil-deck-0-11-card" },
      ],
      eggDeck: [
        { card: "BT1-003", as: "drasil-egg-0-0-card" },
        { card: "BT1-003", as: "drasil-egg-0-1-card" },
        { card: "BT1-003", as: "drasil-egg-0-2-card" },
      ],
      security: [
        { card: "BT1-009", as: "drasil-security-0-0-card" },
        { card: "BT1-009", as: "drasil-security-0-1-card" },
        { card: "BT1-009", as: "drasil-security-0-2-card" },
        { card: "BT1-009", as: "drasil-security-0-3-card" },
        { card: "BT1-009", as: "drasil-security-0-4-card" },
      ],
      breeding: {
        card: "BT13-007",
        as: "own-drasil-breeding",
        top: { card: "BT13-007", as: "own-card-drasil-breeding-card" },
        dp: 0,
        placedByEffect: false,
      },
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "drasil-deck-1-0-card" },
        { card: "BT1-009", as: "drasil-deck-1-1-card" },
        { card: "BT1-009", as: "drasil-deck-1-2-card" },
        { card: "BT1-009", as: "drasil-deck-1-3-card" },
        { card: "BT1-009", as: "drasil-deck-1-4-card" },
        { card: "BT1-009", as: "drasil-deck-1-5-card" },
        { card: "BT1-009", as: "drasil-deck-1-6-card" },
        { card: "BT1-009", as: "drasil-deck-1-7-card" },
        { card: "BT1-009", as: "drasil-deck-1-8-card" },
        { card: "BT1-009", as: "drasil-deck-1-9-card" },
        { card: "BT1-009", as: "drasil-deck-1-10-card" },
        { card: "BT1-009", as: "drasil-deck-1-11-card" },
      ],
      eggDeck: [
        { card: "BT1-003", as: "drasil-egg-1-0-card" },
        { card: "BT1-003", as: "drasil-egg-1-1-card" },
        { card: "BT1-003", as: "drasil-egg-1-2-card" },
      ],
      security: [
        { card: "BT1-009", as: "drasil-security-1-0-card" },
        { card: "BT1-009", as: "drasil-security-1-1-card" },
        { card: "BT1-009", as: "drasil-security-1-2-card" },
        { card: "BT1-009", as: "drasil-security-1-3-card" },
        { card: "BT1-009", as: "drasil-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "AD1-008",
          as: "opponent-drasil-gallantmon",
          top: { card: "AD1-008", as: "opponent-card-drasil-gallantmon-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "BT12-089", as: "opponent-source-drasil-gallantmon-0-card" }],
        },
      ],
    },
  },
  memory: 0,
  turnSeat: 1,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
