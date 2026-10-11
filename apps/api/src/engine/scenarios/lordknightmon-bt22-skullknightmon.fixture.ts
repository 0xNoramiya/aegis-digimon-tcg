import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "lordknightmon-bt22-skullknightmon",
  board: {
    "0": {
      deck: [
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-0-card" },
        { card: "EX10-026", as: "lordknightmon-bt22-deck-0-1-card" },
        { card: "EX13-058", as: "lordknightmon-bt22-deck-0-2-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-3-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-4-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-5-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-6-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-7-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-8-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-9-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-10-card" },
        { card: "BT5-042", as: "lordknightmon-bt22-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "lordknightmon-bt22-egg-0-card" }],
      security: [
        { card: "BT1-010", as: "lordknightmon-bt22-security-0-0-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-security-0-1-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-security-0-2-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-security-0-3-card" },
      ],
      battleArea: [
        {
          card: "BT22-067",
          as: "own-lordknightmon-bt22-lordknightmon",
          top: { card: "BT22-067", as: "own-card-lordknightmon-bt22-lordknightmon-card" },
          dp: 12000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-0-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-1-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-2-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-3-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-4-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-5-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-6-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-7-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-8-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-9-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-10-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "lordknightmon-bt22-egg-1-card" }],
      security: [
        { card: "BT1-010", as: "lordknightmon-bt22-security-1-0-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-security-1-1-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-security-1-2-card" },
        { card: "BT1-010", as: "lordknightmon-bt22-security-1-3-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
