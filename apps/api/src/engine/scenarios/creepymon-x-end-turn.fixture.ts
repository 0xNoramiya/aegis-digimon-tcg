import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "creepymon-x-end-turn",
  board: {
    "0": {
      deck: [
        { card: "BT1-027", as: "creepymon-deck-0-0-card" },
        { card: "BT1-027", as: "creepymon-deck-0-1-card" },
        { card: "BT1-027", as: "creepymon-deck-0-2-card" },
        { card: "BT1-027", as: "creepymon-deck-0-3-card" },
        { card: "BT1-027", as: "creepymon-deck-0-4-card" },
        { card: "BT1-027", as: "creepymon-deck-0-5-card" },
        { card: "BT1-027", as: "creepymon-deck-0-6-card" },
        { card: "BT1-027", as: "creepymon-deck-0-7-card" },
        { card: "BT1-027", as: "creepymon-deck-0-8-card" },
        { card: "BT1-027", as: "creepymon-deck-0-9-card" },
        { card: "BT1-027", as: "creepymon-deck-0-10-card" },
        { card: "BT1-027", as: "creepymon-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "creepymon-egg-0-card" }],
      trash: [{ card: "BT24-078", as: "creepymon-x-card" }],
      security: [
        { card: "BT1-027", as: "creepymon-security-0-0-card" },
        { card: "BT1-027", as: "creepymon-security-0-1-card" },
        { card: "BT1-027", as: "creepymon-security-0-2-card" },
        { card: "BT1-027", as: "creepymon-security-0-3-card" },
        { card: "BT1-027", as: "creepymon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "EX10-009",
          as: "own-creepymon",
          top: { card: "EX10-009", as: "own-card-creepymon-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "EX10-046", as: "own-source-creepymon-0-card" }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-027", as: "creepymon-deck-1-0-card" },
        { card: "BT1-027", as: "creepymon-deck-1-1-card" },
        { card: "BT1-027", as: "creepymon-deck-1-2-card" },
        { card: "BT1-027", as: "creepymon-deck-1-3-card" },
        { card: "BT1-027", as: "creepymon-deck-1-4-card" },
        { card: "BT1-027", as: "creepymon-deck-1-5-card" },
        { card: "BT1-027", as: "creepymon-deck-1-6-card" },
        { card: "BT1-027", as: "creepymon-deck-1-7-card" },
        { card: "BT1-027", as: "creepymon-deck-1-8-card" },
        { card: "BT1-027", as: "creepymon-deck-1-9-card" },
        { card: "BT1-027", as: "creepymon-deck-1-10-card" },
        { card: "BT1-027", as: "creepymon-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "creepymon-egg-1-card" }],
      trash: [
        { card: "BT1-027", as: "creepymon-bot-trash-0-card" },
        { card: "BT1-027", as: "creepymon-bot-trash-1-card" },
        { card: "BT1-027", as: "creepymon-bot-trash-2-card" },
        { card: "BT1-027", as: "creepymon-bot-trash-3-card" },
        { card: "BT1-027", as: "creepymon-bot-trash-4-card" },
        { card: "BT1-027", as: "creepymon-bot-trash-5-card" },
        { card: "BT1-027", as: "creepymon-bot-trash-6-card" },
        { card: "BT1-027", as: "creepymon-bot-trash-7-card" },
        { card: "BT1-027", as: "creepymon-bot-trash-8-card" },
      ],
      security: [
        { card: "BT1-027", as: "creepymon-security-1-0-card" },
        { card: "BT1-027", as: "creepymon-security-1-1-card" },
        { card: "BT1-027", as: "creepymon-security-1-2-card" },
        { card: "BT1-027", as: "creepymon-security-1-3-card" },
        { card: "BT1-027", as: "creepymon-security-1-4-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
