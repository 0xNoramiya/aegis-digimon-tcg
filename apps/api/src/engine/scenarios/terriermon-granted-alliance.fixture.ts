import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "terriermon-granted-alliance",
  board: {
    "0": {
      hand: [{ card: "BT17-049", as: "terrier-antylamon-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "terrier-deck-0-0-card" },
        { card: "BT1-009", as: "terrier-deck-0-1-card" },
        { card: "BT1-009", as: "terrier-deck-0-2-card" },
        { card: "BT1-009", as: "terrier-deck-0-3-card" },
        { card: "BT1-009", as: "terrier-deck-0-4-card" },
        { card: "BT1-009", as: "terrier-deck-0-5-card" },
        { card: "BT1-009", as: "terrier-deck-0-6-card" },
        { card: "BT1-009", as: "terrier-deck-0-7-card" },
        { card: "BT1-009", as: "terrier-deck-0-8-card" },
        { card: "BT1-009", as: "terrier-deck-0-9-card" },
        { card: "BT1-009", as: "terrier-deck-0-10-card" },
        { card: "BT1-009", as: "terrier-deck-0-11-card" },
      ],
      eggDeck: [{ card: "EX2-004", as: "terrier-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "terrier-security-0-0-card" },
        { card: "BT1-009", as: "terrier-security-0-1-card" },
        { card: "BT1-009", as: "terrier-security-0-2-card" },
        { card: "BT1-009", as: "terrier-security-0-3-card" },
        { card: "BT1-009", as: "terrier-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-073",
          as: "own-terrier-host",
          top: { card: "BT1-073", as: "own-card-terrier-host-card" },
          dp: 5000,
          placedByEffect: false,
          under: [{ card: "EX4-032", as: "own-source-terrier-host-0-card" }],
        },
        {
          card: "ST17-03",
          as: "own-terrier-lopmon",
          top: { card: "ST17-03", as: "own-card-terrier-lopmon-card" },
          dp: 1000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "terrier-deck-1-0-card" },
        { card: "BT1-009", as: "terrier-deck-1-1-card" },
        { card: "BT1-009", as: "terrier-deck-1-2-card" },
        { card: "BT1-009", as: "terrier-deck-1-3-card" },
        { card: "BT1-009", as: "terrier-deck-1-4-card" },
        { card: "BT1-009", as: "terrier-deck-1-5-card" },
        { card: "BT1-009", as: "terrier-deck-1-6-card" },
        { card: "BT1-009", as: "terrier-deck-1-7-card" },
        { card: "BT1-009", as: "terrier-deck-1-8-card" },
        { card: "BT1-009", as: "terrier-deck-1-9-card" },
        { card: "BT1-009", as: "terrier-deck-1-10-card" },
        { card: "BT1-009", as: "terrier-deck-1-11-card" },
      ],
      eggDeck: [{ card: "EX2-004", as: "terrier-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "terrier-security-1-0-card" },
        { card: "BT1-009", as: "terrier-security-1-1-card" },
        { card: "BT1-009", as: "terrier-security-1-2-card" },
        { card: "BT1-009", as: "terrier-security-1-3-card" },
        { card: "BT1-009", as: "terrier-security-1-4-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
