import type { ScenarioFixture } from "#api/engine/scenario/types";
import evolvedFixture from "#api/engine/scenarios/material-save-digixros-only-names.fixture";

const fixture: ScenarioFixture = {
  ...evolvedFixture,
  name: "material-save-original-names",
  board: {
    ...evolvedFixture.board,
    0: {
      ...evolvedFixture.board[0],
      battleArea: [
        {
          card: "BT10-013",
          as: "shoutmon",
          under: [
            { card: "BT10-060", as: "firstSource" },
            { card: "BT10-034", as: "secondSource" },
          ],
        },
        { card: "BT10-087", as: "tamer" },
      ],
    },
  },
};

export default fixture;
