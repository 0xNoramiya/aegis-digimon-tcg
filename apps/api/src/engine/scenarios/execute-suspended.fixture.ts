import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "execute-suspended",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "execute-deck-0-0-card" },
        { card: "BT1-009", as: "execute-deck-0-1-card" },
        { card: "BT1-009", as: "execute-deck-0-2-card" },
        { card: "BT1-009", as: "execute-deck-0-3-card" },
        { card: "BT1-009", as: "execute-deck-0-4-card" },
        { card: "BT1-009", as: "execute-deck-0-5-card" },
        { card: "BT1-009", as: "execute-deck-0-6-card" },
        { card: "BT1-009", as: "execute-deck-0-7-card" },
        { card: "BT1-009", as: "execute-deck-0-8-card" },
        { card: "BT1-009", as: "execute-deck-0-9-card" },
        { card: "BT1-009", as: "execute-deck-0-10-card" },
        { card: "BT1-009", as: "execute-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "execute-egg-0-card" }],
      security: [
        { card: "BT1-010", as: "execute-security-0-0-card" },
        { card: "BT1-010", as: "execute-security-0-1-card" },
        { card: "BT1-010", as: "execute-security-0-2-card" },
        { card: "BT1-010", as: "execute-security-0-3-card" },
      ],
      battleArea: [
        {
          card: "EX12-047",
          as: "own-execute-host",
          top: { card: "EX12-047", as: "own-card-execute-host-card" },
          dp: 12000,
          placedByEffect: false,
          under: [
            { card: "EX12-004", as: "own-source-execute-host-0-card" },
            { card: "EX12-063", as: "own-source-execute-host-1-card" },
          ],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "execute-deck-1-0-card" },
        { card: "BT1-009", as: "execute-deck-1-1-card" },
        { card: "BT1-009", as: "execute-deck-1-2-card" },
        { card: "BT1-009", as: "execute-deck-1-3-card" },
        { card: "BT1-009", as: "execute-deck-1-4-card" },
        { card: "BT1-009", as: "execute-deck-1-5-card" },
        { card: "BT1-009", as: "execute-deck-1-6-card" },
        { card: "BT1-009", as: "execute-deck-1-7-card" },
        { card: "BT1-009", as: "execute-deck-1-8-card" },
        { card: "BT1-009", as: "execute-deck-1-9-card" },
        { card: "BT1-009", as: "execute-deck-1-10-card" },
        { card: "BT1-009", as: "execute-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "execute-egg-1-card" }],
      security: [
        { card: "BT1-010", as: "execute-security-1-0-card" },
        { card: "BT1-010", as: "execute-security-1-1-card" },
        { card: "BT1-010", as: "execute-security-1-2-card" },
        { card: "BT1-010", as: "execute-security-1-3-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
