import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "suspended-tyrantkabuterimon-ignores-paladin-mode",
  memory: 3,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "EX13-076", as: "paladinMode", under: [{ card: "BT1-010", as: "paladinSource" }] }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: ["BT1-010", "BT1-010", "BT1-010"],
    },
    1: {
      battleArea: [
        {
          card: "BT16-048",
          as: "tyrantKabuterimon",
          under: [
            { card: "BT1-010", as: "tyrantSourceBottom" },
            { card: "BT1-011", as: "tyrantSourceMiddle" },
            { card: "BT1-014", as: "tyrantSourceTop" },
          ],
        },
        { card: "BT1-010", as: "sourcelessRookie" },
      ],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: ["BT1-010", "BT1-010", "BT1-010"],
    },
  },
};

export default fixture;
