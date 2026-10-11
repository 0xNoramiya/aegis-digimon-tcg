import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "bt22-gabumon-eot-dna",
  board: {
    "0": {
      hand: [
        { card: "BT22-026", as: "gabu-metal-card", faceUp: false },
        { card: "BT22-013", as: "gabu-war-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "gabu-deck-0-0-card" },
        { card: "BT1-009", as: "gabu-deck-0-1-card" },
        { card: "BT1-009", as: "gabu-deck-0-2-card" },
        { card: "BT1-009", as: "gabu-deck-0-3-card" },
        { card: "BT1-009", as: "gabu-deck-0-4-card" },
        { card: "BT1-009", as: "gabu-deck-0-5-card" },
        { card: "BT1-009", as: "gabu-deck-0-6-card" },
        { card: "BT1-009", as: "gabu-deck-0-7-card" },
        { card: "BT1-009", as: "gabu-deck-0-8-card" },
        { card: "BT1-009", as: "gabu-deck-0-9-card" },
        { card: "BT1-009", as: "gabu-deck-0-10-card" },
        { card: "BT1-009", as: "gabu-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "gabu-egg-0-card" }],
      trash: [
        { card: "BT22-008", as: "gabu-agu-card" },
        { card: "AD1-025", as: "gabu-omni-card" },
      ],
      security: [
        { card: "BT1-009", as: "gabu-security-0-0-card" },
        { card: "BT1-009", as: "gabu-security-0-1-card" },
        { card: "BT1-009", as: "gabu-security-0-2-card" },
        { card: "BT1-009", as: "gabu-security-0-3-card" },
        { card: "BT1-009", as: "gabu-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT22-017",
          as: "own-gabu",
          top: { card: "BT22-017", as: "own-card-gabu-card" },
          dp: 1000,
          placedByEffect: false,
        },
        {
          card: "EX13-067",
          as: "own-gabu-nokia",
          top: { card: "EX13-067", as: "own-card-gabu-nokia-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "gabu-deck-1-0-card" },
        { card: "BT1-009", as: "gabu-deck-1-1-card" },
        { card: "BT1-009", as: "gabu-deck-1-2-card" },
        { card: "BT1-009", as: "gabu-deck-1-3-card" },
        { card: "BT1-009", as: "gabu-deck-1-4-card" },
        { card: "BT1-009", as: "gabu-deck-1-5-card" },
        { card: "BT1-009", as: "gabu-deck-1-6-card" },
        { card: "BT1-009", as: "gabu-deck-1-7-card" },
        { card: "BT1-009", as: "gabu-deck-1-8-card" },
        { card: "BT1-009", as: "gabu-deck-1-9-card" },
        { card: "BT1-009", as: "gabu-deck-1-10-card" },
        { card: "BT1-009", as: "gabu-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "gabu-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "gabu-security-1-0-card" },
        { card: "BT1-009", as: "gabu-security-1-1-card" },
        { card: "BT1-009", as: "gabu-security-1-2-card" },
        { card: "BT1-009", as: "gabu-security-1-3-card" },
        { card: "BT1-009", as: "gabu-security-1-4-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
