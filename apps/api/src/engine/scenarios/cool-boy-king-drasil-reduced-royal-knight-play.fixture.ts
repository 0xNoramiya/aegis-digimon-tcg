import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "cool-boy-king-drasil-reduced-royal-knight-play",
  memory: 1,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      breeding: {
        card: "BT13-007",
        as: "kingDrasil",
        under: ["BT1-001", "BT1-002", "BT1-001", "BT1-002", "BT1-001"],
      },
      battleArea: [{ card: "EX11-071", as: "coolBoy" }],
      hand: [
        { card: "BT23-047", as: "examon" },
        { card: "BT23-054", as: "magnamon" },
        { card: "BT23-054", as: "secondMagnamon" },
        { card: "EX11-053", as: "omekamon" },
      ],
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
