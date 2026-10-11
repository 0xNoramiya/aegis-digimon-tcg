import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "raid-after-dedigivolve",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "raid-deck-0-0-card" },
        { card: "BT1-009", as: "raid-deck-0-1-card" },
        { card: "BT1-009", as: "raid-deck-0-2-card" },
        { card: "BT1-009", as: "raid-deck-0-3-card" },
        { card: "BT1-009", as: "raid-deck-0-4-card" },
        { card: "BT1-009", as: "raid-deck-0-5-card" },
        { card: "BT1-009", as: "raid-deck-0-6-card" },
        { card: "BT1-009", as: "raid-deck-0-7-card" },
        { card: "BT1-009", as: "raid-deck-0-8-card" },
        { card: "BT1-009", as: "raid-deck-0-9-card" },
        { card: "BT1-009", as: "raid-deck-0-10-card" },
        { card: "BT1-009", as: "raid-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "raid-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "raid-security-0-0-card" },
        { card: "BT1-009", as: "raid-security-0-1-card" },
        { card: "BT1-009", as: "raid-security-0-2-card" },
        { card: "BT1-009", as: "raid-security-0-3-card" },
        { card: "BT1-009", as: "raid-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "AD1-025",
          as: "own-raid-attacker",
          top: { card: "AD1-025", as: "own-card-raid-attacker-card" },
          dp: 15000,
          placedByEffect: false,
          under: [
            { card: "AD1-014", as: "own-source-raid-attacker-0-card" },
            { card: "AD1-004", as: "own-source-raid-attacker-1-card" },
          ],
        },
        {
          card: "BT1-086",
          as: "own-raid-matt",
          top: { card: "BT1-086", as: "own-card-raid-matt-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT1-089",
          as: "own-raid-mimi",
          top: { card: "BT1-089", as: "own-card-raid-mimi-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "raid-deck-1-0-card" },
        { card: "BT1-009", as: "raid-deck-1-1-card" },
        { card: "BT1-009", as: "raid-deck-1-2-card" },
        { card: "BT1-009", as: "raid-deck-1-3-card" },
        { card: "BT1-009", as: "raid-deck-1-4-card" },
        { card: "BT1-009", as: "raid-deck-1-5-card" },
        { card: "BT1-009", as: "raid-deck-1-6-card" },
        { card: "BT1-009", as: "raid-deck-1-7-card" },
        { card: "BT1-009", as: "raid-deck-1-8-card" },
        { card: "BT1-009", as: "raid-deck-1-9-card" },
        { card: "BT1-009", as: "raid-deck-1-10-card" },
        { card: "BT1-009", as: "raid-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "raid-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "raid-security-1-0-card" },
        { card: "BT1-009", as: "raid-security-1-1-card" },
        { card: "BT1-009", as: "raid-security-1-2-card" },
        { card: "BT1-009", as: "raid-security-1-3-card" },
        { card: "BT1-009", as: "raid-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "BT22-052",
          as: "opponent-raid-target",
          top: { card: "BT22-052", as: "opponent-card-raid-target-card" },
          dp: 12000,
          placedByEffect: false,
        },
        {
          card: "EX13-052",
          as: "opponent-raid-guard",
          top: { card: "EX13-052", as: "opponent-card-raid-guard-card" },
          dp: 4000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
