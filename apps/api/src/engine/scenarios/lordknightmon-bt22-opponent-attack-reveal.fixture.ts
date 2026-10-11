import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "lordknightmon-bt22-opponent-attack-reveal",
  board: {
    "0": {
      deck: [
        { card: "EX10-026", as: "lk-opponent-attack-deck-0-0-card" },
        { card: "EX13-058", as: "lk-opponent-attack-deck-0-1-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-2-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-3-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-4-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-5-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-6-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-7-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-8-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-9-card" },
        { card: "BT5-042", as: "lk-opponent-attack-deck-0-10-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "lk-opponent-attack-egg-0-card" }],
      security: [
        { card: "BT1-010", as: "lk-opponent-attack-security-0-0-card" },
        { card: "BT1-010", as: "lk-opponent-attack-security-0-1-card" },
        { card: "BT1-010", as: "lk-opponent-attack-security-0-2-card" },
        { card: "BT1-010", as: "lk-opponent-attack-security-0-3-card" },
      ],
      battleArea: [
        {
          card: "BT22-067",
          as: "own-lk-opponent-attack-lordknightmon",
          top: { card: "BT22-067", as: "own-card-lk-opponent-attack-lordknightmon-card" },
          dp: 12000,
          placedByEffect: false,
          suspended: true,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-0-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-1-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-2-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-3-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-4-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-5-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-6-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-7-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-8-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-9-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-10-card" },
        { card: "BT1-010", as: "lk-opponent-attack-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "lk-opponent-attack-egg-1-card" }],
      security: [
        { card: "BT1-010", as: "lk-opponent-attack-security-1-0-card" },
        { card: "BT1-010", as: "lk-opponent-attack-security-1-1-card" },
        { card: "BT1-010", as: "lk-opponent-attack-security-1-2-card" },
        { card: "BT1-010", as: "lk-opponent-attack-security-1-3-card" },
      ],
      battleArea: [
        {
          card: "BT1-010",
          as: "opponent-lk-opponent-attack-agumon",
          top: { card: "BT1-010", as: "opponent-card-lk-opponent-attack-agumon-card" },
          dp: 2000,
          placedByEffect: false,
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
