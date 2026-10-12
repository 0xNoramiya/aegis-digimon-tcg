import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "zero-dp-deleted-before-effect-attack-triggers",
  memory: 6,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "EX12-045", as: "sanzomon" }],
      hand: [{ card: "EX12-048", as: "seitenGokuumon" }],
      deck: Array.from({ length: 16 }, () => "BT1-019"),
      security: ["BT1-019", "BT1-019", "BT1-019"],
    },
    1: {
      battleArea: [
        { card: "BT1-019", as: "zeroDpTarget" },
        { card: "BT1-024", as: "survivor" },
        { card: "BT1-020", as: "otherSurvivor" },
      ],
      deck: Array.from({ length: 16 }, () => "BT1-019"),
      security: ["BT1-019", "BT1-019", "BT1-019"],
    },
  },
};

export default fixture;
