import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "omnimon-x-raid-piercing",
  board: {
    "0": {
      deck: [
        { card: "BT1-085", as: "deck-0-0-card" },
        { card: "BT1-085", as: "deck-0-1-card" },
        { card: "BT1-085", as: "deck-0-2-card" },
        { card: "BT1-085", as: "deck-0-3-card" },
        { card: "BT1-085", as: "deck-0-4-card" },
        { card: "BT1-085", as: "deck-0-5-card" },
        { card: "BT1-085", as: "deck-0-6-card" },
        { card: "BT1-085", as: "deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-085", as: "security-0-0-card" },
        { card: "BT1-085", as: "security-0-1-card" },
        { card: "BT1-085", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT20-102",
          as: "own-omnimon",
          top: { card: "BT20-102", as: "own-card-omnimon-card" },
          dp: 16000,
          placedByEffect: false,
          under: [
            { card: "AD1-004", as: "own-source-omnimon-0-card" },
            { card: "BT5-086", as: "own-source-omnimon-1-card" },
          ],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "deck-1-0-card" },
        { card: "BT1-085", as: "deck-1-1-card" },
        { card: "BT1-085", as: "deck-1-2-card" },
        { card: "BT1-085", as: "deck-1-3-card" },
        { card: "BT1-085", as: "deck-1-4-card" },
        { card: "BT1-085", as: "deck-1-5-card" },
        { card: "BT1-085", as: "deck-1-6-card" },
        { card: "BT1-085", as: "deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-085", as: "security-1-0-card" },
        { card: "BT1-085", as: "security-1-1-card" },
        { card: "BT1-085", as: "security-1-2-card" },
      ],
      battleArea: [
        {
          card: "ST2-10",
          as: "opponent-plesiomon",
          top: { card: "ST2-10", as: "opponent-card-plesiomon-card" },
          dp: 12000,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "opponent-monodramon",
          top: { card: "BT1-009", as: "opponent-card-monodramon-card" },
          dp: 3000,
          placedByEffect: false,
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
