import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "bt5-koromon-attack-draw",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "koromon-deck-0-0-card" },
        { card: "BT1-009", as: "koromon-deck-0-1-card" },
        { card: "BT1-009", as: "koromon-deck-0-2-card" },
        { card: "BT1-009", as: "koromon-deck-0-3-card" },
        { card: "BT1-009", as: "koromon-deck-0-4-card" },
        { card: "BT1-009", as: "koromon-deck-0-5-card" },
        { card: "BT1-009", as: "koromon-deck-0-6-card" },
        { card: "BT1-009", as: "koromon-deck-0-7-card" },
        { card: "BT1-009", as: "koromon-deck-0-8-card" },
        { card: "BT1-009", as: "koromon-deck-0-9-card" },
        { card: "BT1-009", as: "koromon-deck-0-10-card" },
        { card: "BT1-009", as: "koromon-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT5-001", as: "koromon-egg-0-card" }],
      security: [
        { card: "EX4-017", as: "koromon-security-0-0-card" },
        { card: "EX4-017", as: "koromon-security-0-1-card" },
        { card: "EX4-017", as: "koromon-security-0-2-card" },
        { card: "EX4-017", as: "koromon-security-0-3-card" },
        { card: "EX4-017", as: "koromon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT12-062",
          as: "own-koromon-greymon",
          top: { card: "BT12-062", as: "own-card-koromon-greymon-card" },
          dp: 5000,
          placedByEffect: false,
          under: [
            { card: "BT5-001", as: "own-source-koromon-greymon-0-card" },
            { card: "BT12-059", as: "own-source-koromon-greymon-1-card" },
            { card: "BT9-008", as: "own-source-koromon-greymon-2-card" },
          ],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "koromon-deck-1-0-card" },
        { card: "BT1-009", as: "koromon-deck-1-1-card" },
        { card: "BT1-009", as: "koromon-deck-1-2-card" },
        { card: "BT1-009", as: "koromon-deck-1-3-card" },
        { card: "BT1-009", as: "koromon-deck-1-4-card" },
        { card: "BT1-009", as: "koromon-deck-1-5-card" },
        { card: "BT1-009", as: "koromon-deck-1-6-card" },
        { card: "BT1-009", as: "koromon-deck-1-7-card" },
        { card: "BT1-009", as: "koromon-deck-1-8-card" },
        { card: "BT1-009", as: "koromon-deck-1-9-card" },
        { card: "BT1-009", as: "koromon-deck-1-10-card" },
        { card: "BT1-009", as: "koromon-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT5-001", as: "koromon-egg-1-card" }],
      security: [
        { card: "EX4-017", as: "koromon-security-1-0-card" },
        { card: "EX4-017", as: "koromon-security-1-1-card" },
        { card: "EX4-017", as: "koromon-security-1-2-card" },
        { card: "EX4-017", as: "koromon-security-1-3-card" },
        { card: "EX4-017", as: "koromon-security-1-4-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
