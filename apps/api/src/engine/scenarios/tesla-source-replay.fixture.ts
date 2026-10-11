import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "tesla-source-replay",
  board: {
    "0": {
      hand: [
        { card: "EX8-068", as: "teslajellymon-option1-card", faceUp: false },
        { card: "EX8-068", as: "teslajellymon-option2-card", faceUp: false },
        { card: "EX8-024", as: "teslajellymon-mega-card", faceUp: false },
        { card: "BT20-026", as: "teslajellymon-megaX-card", faceUp: false },
        { card: "EX8-027", as: "teslajellymon-plesi-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "teslajellymon-deck-0-0-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-1-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-2-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-3-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-4-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-5-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-6-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-7-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-8-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-9-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-10-card" },
        { card: "BT1-009", as: "teslajellymon-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "teslajellymon-egg-card" }],
      security: [
        { card: "BT1-009", as: "teslajellymon-security-0-0-card" },
        { card: "BT1-009", as: "teslajellymon-security-0-1-card" },
        { card: "BT1-009", as: "teslajellymon-security-0-2-card" },
        { card: "BT1-009", as: "teslajellymon-security-0-3-card" },
        { card: "BT1-009", as: "teslajellymon-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "EX12-027",
          as: "own-teslajellymon",
          top: { card: "EX12-027", as: "own-card-teslajellymon-card" },
          dp: 6000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "teslajellymon-deck-1-0-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-1-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-2-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-3-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-4-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-5-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-6-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-7-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-8-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-9-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-10-card" },
        { card: "BT1-009", as: "teslajellymon-deck-1-11-card" },
      ],
      security: [
        { card: "BT1-009", as: "teslajellymon-security-1-0-card" },
        { card: "BT1-009", as: "teslajellymon-security-1-1-card" },
        { card: "BT1-009", as: "teslajellymon-security-1-2-card" },
        { card: "BT1-009", as: "teslajellymon-security-1-3-card" },
        { card: "BT1-009", as: "teslajellymon-security-1-4-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
