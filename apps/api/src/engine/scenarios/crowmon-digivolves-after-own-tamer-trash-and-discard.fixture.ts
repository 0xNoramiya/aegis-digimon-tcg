import type { ScenarioFixture } from "../scenario/types.js";

const deck = (seat: 0 | 1) =>
  Array.from({ length: 8 }, (_, index) => ({ card: "BT1-009", as: `deck-${seat}-${index}-card` }));

const fixture: ScenarioFixture = {
  name: "crowmon-digivolves-after-own-tamer-trash-and-discard",
  board: {
    "0": {
      deck: deck(0),
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
      ],
      hand: [{ card: "BT26-076", as: "crowmon-card" }],
      trash: [{ card: "EX4-058", as: "ravemon-card" }],
      battleArea: [
        { card: "BT26-039", as: "sunflowmon", top: { card: "BT26-039", as: "sunflowmon-card" } },
        {
          card: "EX13-072",
          as: "tamer",
          top: { card: "EX13-072", as: "tamer-card" },
          under: [{ card: "BT1-010", as: "tamer-face-down-card", faceUp: false }],
        },
      ],
    },
    "1": {
      deck: deck(1),
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
      ],
      hand: [
        { card: "BT1-011", as: "discarded-card" },
        { card: "BT1-012", as: "kept-card" },
      ],
      battleArea: [{ card: "BT1-009", as: "monodramon", top: { card: "BT1-009", as: "monodramon-card" } }],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
