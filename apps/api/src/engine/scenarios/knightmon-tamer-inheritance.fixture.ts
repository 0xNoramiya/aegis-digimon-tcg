import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "knightmon-tamer-inheritance",
  memory: 5,
  turnSeat: 1,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: { opponent: { endBreeding: true, main: [{ kind: "attack" }], fallbackMain: "end" } },
  board: {
    0: {
      battleArea: [{ card: "EX13-074", as: "host", under: [{ card: "P-111", as: "knightmon" }] }],
      hand: [{ card: "BT1-045", as: "playable" }],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: Array(12).fill("BT1-009"), security: 5 },
  },
};

export default fixture;
