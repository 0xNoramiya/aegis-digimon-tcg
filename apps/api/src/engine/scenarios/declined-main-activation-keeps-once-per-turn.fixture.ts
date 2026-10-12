import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "declined-main-activation-keeps-once-per-turn",
  memory: 3,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        {
          card: "EX13-023",
          as: "ulforceHost",
          under: [
            { card: "BT23-027", as: "bottomAngemon" },
            { card: "BT22-043", as: "terriermonSource" },
            { card: "BT23-027", as: "upperAngemon" },
          ],
        },
      ],
      deck: Array.from({ length: 8 }, () => "ST1-03"),
      security: 3,
    },
    1: {
      deck: Array.from({ length: 8 }, () => "ST1-03"),
      security: ["ST1-03", "ST1-03", "ST1-03"],
    },
  },
};

export default fixture;
