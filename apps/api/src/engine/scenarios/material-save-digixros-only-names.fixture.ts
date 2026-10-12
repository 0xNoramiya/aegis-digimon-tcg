import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "material-save-digixros-only-names",
  memory: 5,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        {
          card: "BT10-013",
          as: "shoutmon",
          under: [
            { card: "BT19-061", as: "firstSource" },
            { card: "BT19-038", as: "secondSource" },
          ],
        },
        { card: "BT10-087", as: "tamer" },
      ],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
    1: { security: ["BT13-064", "BT10-042", "BT1-009", "BT1-009", "BT1-009"], deck: Array(12).fill("BT1-009") },
  },
};

export default fixture;
