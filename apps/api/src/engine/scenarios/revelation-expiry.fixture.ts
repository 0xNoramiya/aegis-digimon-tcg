import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "revelation-expiry",
  board: {
    "0": {
      hand: [{ card: "EX13-033", as: "revelation-mistymon-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "revelation-deck-0-0-card" },
        { card: "BT1-009", as: "revelation-deck-0-1-card" },
        { card: "BT1-009", as: "revelation-deck-0-2-card" },
        { card: "BT1-009", as: "revelation-deck-0-3-card" },
        { card: "BT1-009", as: "revelation-deck-0-4-card" },
        { card: "BT1-009", as: "revelation-deck-0-5-card" },
        { card: "BT1-009", as: "revelation-deck-0-6-card" },
        { card: "BT1-009", as: "revelation-deck-0-7-card" },
        { card: "BT1-009", as: "revelation-deck-0-8-card" },
        { card: "BT1-009", as: "revelation-deck-0-9-card" },
        { card: "BT1-009", as: "revelation-deck-0-10-card" },
        { card: "BT1-009", as: "revelation-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "revelation-egg-0-card" }],
      security: [
        { card: "BT15-092", as: "revelation-security-0-0-card" },
        { card: "BT1-009", as: "revelation-security-0-1-card" },
        { card: "BT1-009", as: "revelation-security-0-2-card" },
        { card: "BT1-009", as: "revelation-security-0-3-card" },
        { card: "BT1-009", as: "revelation-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT18-036",
          as: "own-revelation-host",
          top: { card: "BT18-036", as: "own-card-revelation-host-card" },
          dp: 5000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [{ card: "BT1-024", as: "revelation-late-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "revelation-deck-1-0-card" },
        { card: "BT1-009", as: "revelation-deck-1-1-card" },
        { card: "BT1-009", as: "revelation-deck-1-2-card" },
        { card: "BT1-009", as: "revelation-deck-1-3-card" },
        { card: "BT1-009", as: "revelation-deck-1-4-card" },
        { card: "BT1-009", as: "revelation-deck-1-5-card" },
        { card: "BT1-009", as: "revelation-deck-1-6-card" },
        { card: "BT1-009", as: "revelation-deck-1-7-card" },
        { card: "BT1-009", as: "revelation-deck-1-8-card" },
        { card: "BT1-009", as: "revelation-deck-1-9-card" },
        { card: "BT1-009", as: "revelation-deck-1-10-card" },
        { card: "BT1-009", as: "revelation-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "revelation-egg-1-card" }],
      security: [
        { card: "BT1-024", as: "revelation-security-1-0-card" },
        { card: "BT1-024", as: "revelation-security-1-1-card" },
        { card: "BT1-024", as: "revelation-security-1-2-card" },
        { card: "BT1-024", as: "revelation-security-1-3-card" },
        { card: "BT1-024", as: "revelation-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "BT15-053",
          as: "opponent-revelation-target",
          top: { card: "BT15-053", as: "opponent-card-revelation-target-card" },
          dp: 12000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 0,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
