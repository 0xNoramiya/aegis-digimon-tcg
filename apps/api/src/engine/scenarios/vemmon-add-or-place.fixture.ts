import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "vemmon-add-or-place",
  board: {
    "0": {
      hand: [{ card: "BT18-060", as: "vemmon-bt18-card", faceUp: false }],
      deck: [
        { card: "BT1-085", as: "vemmon-draw-0-card" },
        { card: "BT18-065", as: "vemmon-reveal-snatchmon-card" },
        { card: "EX11-066", as: "vemmon-reveal-xeno-card" },
        { card: "BT11-061", as: "vemmon-reveal-bt11-card" },
        { card: "BT1-085", as: "vemmon-deck-0-0-card" },
        { card: "BT1-085", as: "vemmon-deck-0-1-card" },
        { card: "BT1-085", as: "vemmon-deck-0-2-card" },
        { card: "BT1-085", as: "vemmon-deck-0-3-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "vemmon-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "vemmon-security-0-0-card" },
        { card: "BT1-085", as: "vemmon-security-0-1-card" },
        { card: "BT1-085", as: "vemmon-security-0-2-card" },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "vemmon-draw-1-card" },
        { card: "BT1-085", as: "vemmon-deck-1-0-card" },
        { card: "BT1-085", as: "vemmon-deck-1-1-card" },
        { card: "BT1-085", as: "vemmon-deck-1-2-card" },
        { card: "BT1-085", as: "vemmon-deck-1-3-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "vemmon-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "vemmon-security-1-0-card" },
        { card: "BT1-085", as: "vemmon-security-1-1-card" },
        { card: "BT1-085", as: "vemmon-security-1-2-card" },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
