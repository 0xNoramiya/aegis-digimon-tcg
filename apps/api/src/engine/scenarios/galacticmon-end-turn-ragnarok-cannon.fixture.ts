import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "galacticmon-end-turn-ragnarok-cannon",
  memory: 3,
  turnSeat: 1,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT21-001"],
      battleArea: [{ card: "EX11-046", as: "assembledGalacticmon" }],
      hand: [
        { card: "BT21-062", as: "evolutionGalacticmon" },
        { card: "BT21-098", as: "ragnarokCannon" },
      ],
      trash: [
        { card: "BT21-056", as: "vemmonA" },
        { card: "BT21-056", as: "vemmonB" },
        { card: "BT11-065", as: "snatchmonA" },
        { card: "BT11-065", as: "snatchmonB" },
        { card: "BT1-010", as: "unrelatedTrash" },
      ],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: ["BT1-010", "BT1-010", "BT1-010"],
    },
    1: {
      battleArea: [
        { card: "BT1-009", as: "cheapestRival" },
        { card: "BT1-024", as: "costlyRival" },
      ],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 5,
    },
  },
};

export default fixture;
