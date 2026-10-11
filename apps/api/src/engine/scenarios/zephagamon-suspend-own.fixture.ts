import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "zephagamon-suspend-own",
  board: {
    "0": {
      hand: [
        { card: "EX11-035", as: "zephagamon-card" },
        { card: "ST18-04", as: "hand-pteromon-card" },
      ],
      deck: [
        { card: "BT1-010", as: "deck-0-0-card" },
        { card: "BT1-010", as: "deck-0-1-card" },
        { card: "BT1-010", as: "deck-0-2-card" },
        { card: "BT1-010", as: "deck-0-3-card" },
        { card: "BT1-010", as: "deck-0-4-card" },
        { card: "BT1-010", as: "deck-0-5-card" },
        { card: "BT1-010", as: "deck-0-6-card" },
        { card: "BT1-010", as: "deck-0-7-card" },
        { card: "BT1-010", as: "deck-0-8-card" },
        { card: "BT1-010", as: "deck-0-9-card" },
        { card: "BT1-010", as: "deck-0-10-card" },
        { card: "BT1-010", as: "deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-010", as: "security-0-0-card" },
        { card: "BT1-010", as: "security-0-1-card" },
        { card: "BT1-010", as: "security-0-2-card" },
        { card: "BT1-010", as: "security-0-3-card" },
      ],
      battleArea: [
        {
          card: "EX11-032",
          as: "own-grandgalemon",
          top: { card: "EX11-032", as: "own-card-grandgalemon-card" },
          dp: 8000,
          placedByEffect: false,
          under: [
            { card: "ST18-04", as: "own-source-grandgalemon-0-card" },
            { card: "EX11-028", as: "own-source-grandgalemon-1-card" },
          ],
        },
        {
          card: "ST18-04",
          as: "own-pteromon",
          top: { card: "ST18-04", as: "own-card-pteromon-card" },
          dp: 1000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-010", as: "deck-1-0-card" },
        { card: "BT1-010", as: "deck-1-1-card" },
        { card: "BT1-010", as: "deck-1-2-card" },
        { card: "BT1-010", as: "deck-1-3-card" },
        { card: "BT1-010", as: "deck-1-4-card" },
        { card: "BT1-010", as: "deck-1-5-card" },
        { card: "BT1-010", as: "deck-1-6-card" },
        { card: "BT1-010", as: "deck-1-7-card" },
        { card: "BT1-010", as: "deck-1-8-card" },
        { card: "BT1-010", as: "deck-1-9-card" },
        { card: "BT1-010", as: "deck-1-10-card" },
        { card: "BT1-010", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-010", as: "security-1-0-card" },
        { card: "BT1-010", as: "security-1-1-card" },
        { card: "BT1-010", as: "security-1-2-card" },
        { card: "BT1-010", as: "security-1-3-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "opponent-monodramon",
          top: { card: "BT1-009", as: "opponent-card-monodramon-card" },
          dp: 3000,
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
