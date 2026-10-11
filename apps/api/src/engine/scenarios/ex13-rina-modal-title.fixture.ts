import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "ex13-rina-modal-title",
  board: {
    "0": {
      hand: [
        { card: "ST8-11", as: "rina-title-sword-card", faceUp: false },
        { card: "BT1-115", as: "rina-title-veedramon-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-085", as: "rina-title-deck-0-0-card" },
        { card: "BT1-085", as: "rina-title-deck-0-1-card" },
        { card: "BT1-085", as: "rina-title-deck-0-2-card" },
        { card: "BT1-085", as: "rina-title-deck-0-3-card" },
        { card: "BT1-085", as: "rina-title-deck-0-4-card" },
        { card: "BT1-085", as: "rina-title-deck-0-5-card" },
        { card: "BT1-085", as: "rina-title-deck-0-6-card" },
        { card: "BT1-085", as: "rina-title-deck-0-7-card" },
        { card: "BT1-085", as: "rina-title-deck-0-8-card" },
        { card: "BT1-085", as: "rina-title-deck-0-9-card" },
        { card: "BT1-085", as: "rina-title-deck-0-10-card" },
        { card: "BT1-085", as: "rina-title-deck-0-11-card" },
      ],
      eggDeck: [{ card: "EX13-002", as: "rina-title-egg-card" }],
      security: [
        { card: "BT1-009", as: "rina-title-security-0-0-card" },
        { card: "BT1-009", as: "rina-title-security-0-1-card" },
        { card: "BT1-009", as: "rina-title-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "EX13-069",
          as: "own-rina-title-rina",
          top: { card: "EX13-069", as: "own-card-rina-title-rina-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT3-021",
          as: "own-rina-title-veemon",
          top: { card: "BT3-021", as: "own-card-rina-title-veemon-card" },
          dp: 2000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "rina-title-deck-1-0-card" },
        { card: "BT1-085", as: "rina-title-deck-1-1-card" },
        { card: "BT1-085", as: "rina-title-deck-1-2-card" },
        { card: "BT1-085", as: "rina-title-deck-1-3-card" },
        { card: "BT1-085", as: "rina-title-deck-1-4-card" },
        { card: "BT1-085", as: "rina-title-deck-1-5-card" },
        { card: "BT1-085", as: "rina-title-deck-1-6-card" },
        { card: "BT1-085", as: "rina-title-deck-1-7-card" },
        { card: "BT1-085", as: "rina-title-deck-1-8-card" },
        { card: "BT1-085", as: "rina-title-deck-1-9-card" },
        { card: "BT1-085", as: "rina-title-deck-1-10-card" },
        { card: "BT1-085", as: "rina-title-deck-1-11-card" },
      ],
      security: [
        { card: "BT1-009", as: "rina-title-security-1-0-card" },
        { card: "BT1-009", as: "rina-title-security-1-1-card" },
        { card: "BT1-009", as: "rina-title-security-1-2-card" },
      ],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
