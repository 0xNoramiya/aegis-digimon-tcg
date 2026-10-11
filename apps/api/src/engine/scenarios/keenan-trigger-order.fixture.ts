import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "keenan-trigger-order",
  board: {
    "0": {
      hand: [
        { card: "BT25-054", as: "keenan-greatgrizzlymon-card", faceUp: false },
        { card: "BT22-052", as: "keenan-leopardmon-card", faceUp: false },
        { card: "EX13-047", as: "keenan-gotsumon-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-085", as: "keenan-deck-0-0-card" },
        { card: "BT1-085", as: "keenan-deck-0-1-card" },
        { card: "BT1-085", as: "keenan-deck-0-2-card" },
        { card: "BT1-085", as: "keenan-deck-0-3-card" },
        { card: "BT1-085", as: "keenan-deck-0-4-card" },
        { card: "BT1-085", as: "keenan-deck-0-5-card" },
        { card: "BT1-085", as: "keenan-deck-0-6-card" },
        { card: "BT1-085", as: "keenan-deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "keenan-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "keenan-security-0-0-card" },
        { card: "BT1-085", as: "keenan-security-0-1-card" },
        { card: "BT1-085", as: "keenan-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "EX13-051",
          as: "own-keenan-guardromon",
          top: { card: "EX13-051", as: "own-card-keenan-guardromon-card" },
          dp: 5000,
          placedByEffect: false,
          under: [
            { card: "BT16-005", as: "own-source-keenan-guardromon-0-card" },
            { card: "EX13-047", as: "own-source-keenan-guardromon-1-card" },
          ],
        },
        {
          card: "BT13-102",
          as: "own-keenan-tamer",
          top: { card: "BT13-102", as: "own-card-keenan-tamer-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "keenan-deck-1-0-card" },
        { card: "BT1-085", as: "keenan-deck-1-1-card" },
        { card: "BT1-085", as: "keenan-deck-1-2-card" },
        { card: "BT1-085", as: "keenan-deck-1-3-card" },
        { card: "BT1-085", as: "keenan-deck-1-4-card" },
        { card: "BT1-085", as: "keenan-deck-1-5-card" },
        { card: "BT1-085", as: "keenan-deck-1-6-card" },
        { card: "BT1-085", as: "keenan-deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "keenan-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "keenan-security-1-0-card" },
        { card: "BT1-085", as: "keenan-security-1-1-card" },
        { card: "BT1-085", as: "keenan-security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT26-072",
          as: "opponent-keenan-peckmon",
          top: { card: "BT26-072", as: "opponent-card-keenan-peckmon-card" },
          dp: 5000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 4,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
