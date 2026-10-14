import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "end-turn-memory-swing-ends-turn-once",
  memory: 2,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "EX12-019", as: "nezhamon" }],
      deck: Array.from({ length: 16 }, () => "BT1-019"),
      security: ["BT1-019", "BT1-019", "BT1-019"],
    },
    1: {
      battleArea: [
        { card: "BT22-052", as: "overflowBlocker" },
        { card: "BT20-060", as: "memoryGainer", suspended: true },
      ],
      deck: Array.from({ length: 16 }, () => "BT1-019"),
      security: ["BT1-019", "BT1-019", "BT1-019"],
    },
  },
};

export default fixture;
