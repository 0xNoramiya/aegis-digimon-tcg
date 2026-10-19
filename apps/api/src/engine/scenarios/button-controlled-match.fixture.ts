import type { ScenarioFixture } from "#api/engine/scenario/types";
import fixtureKnightmonAura from "#api/engine/scenarios/knightmon-aura.fixture";

const fixture: ScenarioFixture = {
  ...fixtureKnightmonAura,
  name: "button-controlled-match",
  board: {
    ...fixtureKnightmonAura.board,
    0: {
      ...fixtureKnightmonAura.board[0],
      hand: [{ card: "BT1-009", as: "playable-rookie" }],
    },
  },
};

export default fixture;
