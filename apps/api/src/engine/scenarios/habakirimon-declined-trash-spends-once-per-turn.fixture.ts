import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "habakirimon-declined-trash-spends-once-per-turn",
  memory: 6,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-058", as: "yellowBase" }],
      hand: [{ card: "BT25-043", as: "habakirimon" }],
      deck: Array.from({ length: 8 }, () => "ST1-03"),
      security: ["ST1-03", "ST1-03"],
    },
    1: {
      deck: Array.from({ length: 8 }, () => "ST1-03"),
      security: ["ST1-03", "ST1-03", "ST1-03", "ST1-03"],
    },
  },
};

export default fixture;
