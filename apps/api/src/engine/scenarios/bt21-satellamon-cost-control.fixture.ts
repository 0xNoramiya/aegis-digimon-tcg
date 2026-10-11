import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "bt21-satellamon-cost-control",
  board: {
    "0": {
      hand: [
        { card: "BT21-074", as: "satellamon-source-card", faceUp: false },
        { card: "BT21-074", as: "satellamon-hand-0-card", faceUp: false },
        { card: "LM-067", as: "satellamon-hand-1-card", faceUp: false },
        { card: "EX7-073", as: "satellamon-hand-2-card", faceUp: false },
        { card: "BT25-085", as: "satellamon-hand-3-card", faceUp: false },
        { card: "EX7-071", as: "satellamon-hand-4-card", faceUp: false },
      ],
      deck: [
        { card: "BT25-083", as: "satellamon-draw-card" },
        { card: "BT1-009", as: "satellamon-deck-0-0-card" },
        { card: "BT1-009", as: "satellamon-deck-0-1-card" },
        { card: "BT1-009", as: "satellamon-deck-0-2-card" },
        { card: "BT1-009", as: "satellamon-deck-0-3-card" },
        { card: "BT1-009", as: "satellamon-deck-0-4-card" },
        { card: "BT1-009", as: "satellamon-deck-0-5-card" },
        { card: "BT1-009", as: "satellamon-deck-0-6-card" },
        { card: "BT1-009", as: "satellamon-deck-0-7-card" },
        { card: "BT1-009", as: "satellamon-deck-0-8-card" },
        { card: "BT1-009", as: "satellamon-deck-0-9-card" },
        { card: "BT1-009", as: "satellamon-deck-0-10-card" },
        { card: "BT1-009", as: "satellamon-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "satellamon-egg-0-card" }],
      trash: [
        { card: "EX7-008", as: "satellamon-trash-0-card" },
        { card: "BT25-078", as: "satellamon-trash-1-card" },
        { card: "BT25-085", as: "satellamon-trash-2-card" },
        { card: "EX7-071", as: "satellamon-trash-3-card" },
        { card: "EX7-071", as: "satellamon-trash-4-card" },
        { card: "EX7-071", as: "satellamon-trash-5-card" },
        { card: "BT25-005", as: "satellamon-trash-6-card" },
      ],
      security: [
        { card: "BT1-009", as: "satellamon-security-0-0-card" },
        { card: "BT1-009", as: "satellamon-security-0-1-card" },
        { card: "BT1-009", as: "satellamon-security-0-2-card" },
        { card: "BT1-009", as: "satellamon-security-0-3-card" },
        { card: "BT1-009", as: "satellamon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "own-satellamon-host",
          top: { card: "BT1-009", as: "own-card-satellamon-host-card" },
          dp: 3000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "satellamon-deck-1-0-card" },
        { card: "BT1-009", as: "satellamon-deck-1-1-card" },
        { card: "BT1-009", as: "satellamon-deck-1-2-card" },
        { card: "BT1-009", as: "satellamon-deck-1-3-card" },
        { card: "BT1-009", as: "satellamon-deck-1-4-card" },
        { card: "BT1-009", as: "satellamon-deck-1-5-card" },
        { card: "BT1-009", as: "satellamon-deck-1-6-card" },
        { card: "BT1-009", as: "satellamon-deck-1-7-card" },
        { card: "BT1-009", as: "satellamon-deck-1-8-card" },
        { card: "BT1-009", as: "satellamon-deck-1-9-card" },
        { card: "BT1-009", as: "satellamon-deck-1-10-card" },
        { card: "BT1-009", as: "satellamon-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "satellamon-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "satellamon-security-1-0-card" },
        { card: "BT1-009", as: "satellamon-security-1-1-card" },
        { card: "BT1-009", as: "satellamon-security-1-2-card" },
        { card: "BT1-009", as: "satellamon-security-1-3-card" },
        { card: "BT1-009", as: "satellamon-security-1-4-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
