import type { ScenarioFixture } from "#api/engine/scenario/types";
import motherFixture from "#api/engine/scenarios/mother-scapegoat-payment.fixture";

const fixture: ScenarioFixture = {
  ...motherFixture,
  name: "scapegoat-unpaid-deletion",
  board: {
    ...motherFixture.board,
    0: {
      ...motherFixture.board[0],
      battleArea: [
        { card: "LM-043", as: "holder" },
        { card: "EX12-035", as: "sacrifice" },
      ],
    },
  },
};

export default fixture;
