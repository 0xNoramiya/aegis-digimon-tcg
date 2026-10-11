import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "davis-both-colors",
  board: {
    "0": {
      hand: [{ card: "BT3-093", as: "davis-bt3-card", faceUp: false }],
      deck: [
        { card: "BT1-085", as: "davis-draw-0-card" },
        { card: "P-117", as: "davis-reveal-veemon-card" },
        { card: "BT8-053", as: "davis-reveal-lighdramon-card" },
        { card: "BT1-090", as: "davis-reveal-option-card" },
        { card: "BT1-085", as: "davis-deck-0-0-card" },
        { card: "BT1-085", as: "davis-deck-0-1-card" },
        { card: "BT1-085", as: "davis-deck-0-2-card" },
        { card: "BT1-085", as: "davis-deck-0-3-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "davis-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "davis-security-0-0-card" },
        { card: "BT1-085", as: "davis-security-0-1-card" },
        { card: "BT1-085", as: "davis-security-0-2-card" },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "davis-draw-1-card" },
        { card: "BT1-085", as: "davis-deck-1-0-card" },
        { card: "BT1-085", as: "davis-deck-1-1-card" },
        { card: "BT1-085", as: "davis-deck-1-2-card" },
        { card: "BT1-085", as: "davis-deck-1-3-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "davis-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "davis-security-1-0-card" },
        { card: "BT1-085", as: "davis-security-1-1-card" },
        { card: "BT1-085", as: "davis-security-1-2-card" },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
