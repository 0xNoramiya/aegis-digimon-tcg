import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "alliance-after-evolution",
  board: {
    "0": {
      hand: [
        { card: "EX12-045", as: "hand-EX12-045-card", faceUp: false },
        { card: "EX12-056", as: "hand-EX12-056-card", faceUp: false },
        { card: "EX12-034", as: "hand-EX12-034-card", faceUp: false },
      ],
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
        { card: "BT1-009", as: "deck-0-12-card" },
        { card: "BT1-009", as: "deck-0-13-card" },
        { card: "BT1-009", as: "deck-0-14-card" },
        { card: "BT1-009", as: "deck-0-15-card" },
      ],
      eggDeck: [{ card: "EX12-002", as: "egg-0-card" }],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
        { card: "BT1-009", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "EX12-043",
          as: "own-host",
          top: { card: "EX12-043", as: "own-card-host-card" },
          dp: 6000,
          placedByEffect: false,
          under: [
            { card: "EX12-002", as: "own-source-host-0-card" },
            { card: "EX12-022", as: "own-source-host-1-card" },
          ],
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
        { card: "BT1-009", as: "deck-1-12-card" },
        { card: "BT1-009", as: "deck-1-13-card" },
        { card: "BT1-009", as: "deck-1-14-card" },
        { card: "BT1-009", as: "deck-1-15-card" },
      ],
      eggDeck: [{ card: "EX12-002", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
        { card: "BT1-009", as: "security-1-2-card" },
        { card: "BT1-009", as: "security-1-3-card" },
        { card: "BT1-009", as: "security-1-4-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
