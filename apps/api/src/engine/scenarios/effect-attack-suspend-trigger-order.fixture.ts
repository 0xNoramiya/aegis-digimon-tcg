import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "effect-attack-suspend-trigger-order",
  memory: 5,
  turnSeat: 1,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        {
          card: "EX13-019",
          as: "veedramon",
          under: [
            { card: "EX13-017", as: "suspendInsteadSource" },
            { card: "EX13-022", as: "unsuspendSource" },
          ],
        },
        { card: "BT1-009", as: "lowestDigimon" },
      ],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [{ card: "BT12-016", as: "wargrowlmon" }],
      hand: [{ card: "AD1-008", as: "gallantmon" }],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
