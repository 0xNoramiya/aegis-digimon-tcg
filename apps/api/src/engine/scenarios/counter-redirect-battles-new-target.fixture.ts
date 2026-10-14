import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "counter-redirect-battles-new-target",
  memory: 3,
  turnSeat: 1,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        { card: "EX12-017", as: "wargreymon", top: { card: "EX12-017", as: "wargreymonCard" } },
        { card: "EX12-035", as: "metalgarurumon" },
      ],
      hand: [{ card: "EX12-037", as: "omnimonCard" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: ["BT1-010", "BT1-010", "BT1-010"],
    },
    1: {
      battleArea: [
        { card: "BT1-069", as: "ogremon" },
        { card: "BT1-010", as: "bystander" },
      ],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: ["BT1-010", "BT1-010", "BT1-010"],
    },
  },
};

export default fixture;
