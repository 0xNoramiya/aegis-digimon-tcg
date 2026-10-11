import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "x7-digixros-zones",
  board: {
    "0": {
      hand: [{ card: "BT10-034", as: "x7-hand-dorulumon-card", faceUp: false }],
      deck: [
        { card: "BT1-085", as: "x7-deck-0-0-card" },
        { card: "BT1-085", as: "x7-deck-0-1-card" },
        { card: "BT1-085", as: "x7-deck-0-2-card" },
        { card: "BT1-085", as: "x7-deck-0-3-card" },
        { card: "BT1-085", as: "x7-deck-0-4-card" },
        { card: "BT1-085", as: "x7-deck-0-5-card" },
        { card: "BT1-085", as: "x7-deck-0-6-card" },
        { card: "BT1-085", as: "x7-deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "x7-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "x7-security-0-0-card" },
        { card: "BT1-085", as: "x7-security-0-1-card" },
        { card: "BT1-085", as: "x7-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "AD1-006",
          as: "own-x7",
          top: { card: "AD1-006", as: "own-card-x7-card" },
          dp: 13000,
          placedByEffect: false,
          under: [
            { card: "BT10-009", as: "own-source-x7-0-card" },
            { card: "BT10-029", as: "own-source-x7-1-card" },
            { card: "BT10-049", as: "own-source-x7-2-card" },
          ],
        },
        {
          card: "BT10-087",
          as: "own-x7-taiki",
          top: { card: "BT10-087", as: "own-card-x7-taiki-card" },
          dp: 0,
          placedByEffect: false,
          under: [{ card: "BT10-034", as: "own-source-x7-taiki-0-card" }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "x7-deck-1-0-card" },
        { card: "BT1-085", as: "x7-deck-1-1-card" },
        { card: "BT1-085", as: "x7-deck-1-2-card" },
        { card: "BT1-085", as: "x7-deck-1-3-card" },
        { card: "BT1-085", as: "x7-deck-1-4-card" },
        { card: "BT1-085", as: "x7-deck-1-5-card" },
        { card: "BT1-085", as: "x7-deck-1-6-card" },
        { card: "BT1-085", as: "x7-deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "x7-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "x7-security-1-0-card" },
        { card: "BT1-085", as: "x7-security-1-1-card" },
        { card: "BT1-085", as: "x7-security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-084",
          as: "opponent-x7-omnimon",
          top: { card: "BT1-084", as: "opponent-card-x7-omnimon-card" },
          dp: 15000,
          placedByEffect: false,
          suspended: true,
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
