import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "taiki-keeps-xros-digimon",
  board: {
    "0": {
      hand: [{ card: "BT10-087", as: "taiki-bt10-card", faceUp: false }],
      deck: [
        { card: "BT1-085", as: "taiki-draw-0-card" },
        { card: "BT21-083", as: "taiki-reveal-taiki-card" },
        { card: "P-224", as: "taiki-reveal-kotone-card" },
        { card: "AD1-006", as: "taiki-reveal-x7-card" },
        { card: "BT8-097", as: "taiki-reveal-option-card" },
        { card: "BT1-085", as: "taiki-deck-0-0-card" },
        { card: "BT1-085", as: "taiki-deck-0-1-card" },
        { card: "BT1-085", as: "taiki-deck-0-2-card" },
        { card: "BT1-085", as: "taiki-deck-0-3-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "taiki-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "taiki-security-0-0-card" },
        { card: "BT1-085", as: "taiki-security-0-1-card" },
        { card: "BT1-085", as: "taiki-security-0-2-card" },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "taiki-draw-1-card" },
        { card: "BT1-085", as: "taiki-deck-1-0-card" },
        { card: "BT1-085", as: "taiki-deck-1-1-card" },
        { card: "BT1-085", as: "taiki-deck-1-2-card" },
        { card: "BT1-085", as: "taiki-deck-1-3-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "taiki-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "taiki-security-1-0-card" },
        { card: "BT1-085", as: "taiki-security-1-1-card" },
        { card: "BT1-085", as: "taiki-security-1-2-card" },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
