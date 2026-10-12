import type { ScenarioFixture } from "#api/engine/scenario/types";
import base from "#api/engine/scenarios/self-deletion-effect-continuation.fixture";

const fixture: ScenarioFixture = {
  ...base,
  name: "self-deletion-dual-only",
  board: {
    ...base.board,
    1: {
      ...base.board[1],
      battleArea: [{ card: "BT26-056", as: "dualTarget", under: ["BT24-021"] }],
    },
  },
};

export default fixture;
