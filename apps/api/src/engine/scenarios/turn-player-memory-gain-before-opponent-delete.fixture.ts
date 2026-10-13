import type { ScenarioFixture } from "../scenario/types.js";

function filler(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({ card: "BT1-010", as: `${prefix}-${index}` }));
}

const fixture: ScenarioFixture = {
  name: "turn-player-memory-gain-before-opponent-delete",
  board: {
    "0": {
      hand: [{ card: "BT11-033", as: "mirage-gaogamon-card" }],
      deck: filler("mirage-deck", 10),
      eggDeck: [{ card: "BT1-001", as: "mirage-egg" }],
      security: filler("mirage-security", 4),
      battleArea: [
        {
          card: "BT1-038",
          as: "mirage-monzaemon",
          top: { card: "BT1-038", as: "mirage-monzaemon-card" },
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: filler("ouryumon-hand", 3),
      deck: filler("ouryumon-deck", 10),
      eggDeck: [{ card: "BT1-001", as: "ouryumon-egg" }],
      security: filler("ouryumon-security", 4),
      battleArea: [
        {
          card: "BT20-018",
          as: "ouryumon",
          top: { card: "BT20-018", as: "ouryumon-card" },
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 4,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export const ouryumonTurnFixture: ScenarioFixture = {
  name: "turn-player-delete-before-opponent-memory-gain",
  board: {
    "0": {
      hand: [{ card: "P-181", as: "security-to-hand-option" }, ...filler("ouryumon-hand", 2)],
      deck: filler("ouryumon-deck", 10),
      eggDeck: [{ card: "BT1-001", as: "ouryumon-egg" }],
      security: filler("ouryumon-security", 4),
      battleArea: [
        {
          card: "BT20-018",
          as: "ouryumon",
          top: { card: "BT20-018", as: "ouryumon-card" },
          placedByEffect: false,
        },
        {
          card: "BT1-064",
          as: "green-partner",
          top: { card: "BT1-064", as: "green-partner-card" },
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: filler("mirage-deck", 10),
      eggDeck: [{ card: "BT1-001", as: "mirage-egg" }],
      security: filler("mirage-security", 4),
      battleArea: [
        {
          card: "BT11-033",
          as: "mirage-gaogamon",
          top: { card: "BT11-033", as: "mirage-gaogamon-card" },
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 4,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
