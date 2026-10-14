import type { ScenarioFixture } from "../scenario/types.js";

const deck = (seat: 0 | 1) =>
  Array.from({ length: 8 }, (_, index) => ({ card: "BT1-009", as: `deck-${seat}-${index}-card` }));

const fixture: ScenarioFixture = {
  name: "turn-player-hand-trash-before-opponent-deletion",
  board: {
    "0": {
      deck: deck(0),
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
      ],
      hand: [
        { card: "BT1-009", as: "plutomon-cost-card" },
        { card: "BT1-009", as: "witchmon-cost-card" },
        { card: "BT1-009", as: "spare-hand-card" },
      ],
      trash: [
        { card: "BT25-080", as: "witchmon-card" },
        { card: "BT25-080", as: "returned-titan-card" },
      ],
      battleArea: [{ card: "BT26-059", as: "plutomon", top: { card: "BT26-059", as: "plutomon-card" } }],
    },
    "1": {
      deck: deck(1),
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
      ],
      battleArea: [
        { card: "EX13-052", as: "gladimon", top: { card: "EX13-052", as: "gladimon-card" } },
        { card: "BT1-009", as: "agumon", top: { card: "BT1-009", as: "agumon-card" } },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
