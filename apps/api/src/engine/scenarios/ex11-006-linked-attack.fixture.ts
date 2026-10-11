import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "ex11-006-linked-attack",
  board: {
    "0": {
      hand: [{ card: "EX11-033", as: "maneuvermon-card" }],
      deck: [
        { card: "BT1-009", as: "deck-0-0-card" },
        { card: "BT1-009", as: "deck-0-1-card" },
        { card: "BT1-009", as: "deck-0-2-card" },
        { card: "BT1-009", as: "deck-0-3-card" },
        { card: "BT1-009", as: "deck-0-4-card" },
        { card: "BT1-009", as: "deck-0-5-card" },
        { card: "BT1-009", as: "deck-0-6-card" },
        { card: "BT1-009", as: "deck-0-7-card" },
        { card: "BT1-009", as: "deck-0-8-card" },
        { card: "BT1-009", as: "deck-0-9-card" },
        { card: "BT1-009", as: "deck-0-10-card" },
        { card: "BT1-009", as: "deck-0-11-card" },
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
          card: "EX11-029",
          as: "own-turbomon",
          top: { card: "EX11-029", as: "own-card-turbomon-card" },
          dp: 5000,
          currentDP: 7000,
          placedByEffect: false,
          under: [
            { card: "EX11-006", as: "own-source-turbomon-0-card" },
            { card: "EX11-027", as: "own-source-turbomon-1-card" },
          ],
          linked: [{ card: "EX11-027", as: "linked-maquinamon-card" }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "deck-1-0-card" },
        { card: "BT1-009", as: "deck-1-1-card" },
        { card: "BT1-009", as: "deck-1-2-card" },
        { card: "BT1-009", as: "deck-1-3-card" },
        { card: "BT1-009", as: "deck-1-4-card" },
        { card: "BT1-009", as: "deck-1-5-card" },
        { card: "BT1-009", as: "deck-1-6-card" },
        { card: "BT1-009", as: "deck-1-7-card" },
        { card: "BT1-009", as: "deck-1-8-card" },
        { card: "BT1-009", as: "deck-1-9-card" },
        { card: "BT1-009", as: "deck-1-10-card" },
        { card: "BT1-009", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-010", as: "security-1-0-card" },
        { card: "BT1-010", as: "security-1-1-card" },
        { card: "BT1-010", as: "security-1-2-card" },
        { card: "BT1-010", as: "security-1-3-card" },
      ],
    },
  },
  memory: 4,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
