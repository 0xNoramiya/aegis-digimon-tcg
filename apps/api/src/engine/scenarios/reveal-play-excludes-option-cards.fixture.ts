import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "reveal-play-excludes-option-cards",
  memory: 10,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT1-003"],
      hand: [
        { card: "EX12-055", as: "andromon" },
        { card: "EX12-058", as: "hiAndromon" },
      ],
      deck: [
        "BT1-010",
        { card: "EX12-073", as: "giantMeat" },
        { card: "EX12-072", as: "metalEmpire" },
        { card: "EX12-053", as: "hagurumon" },
        ...Array.from({ length: 12 }, () => "BT1-010"),
      ],
      security: 3,
    },
    1: { deck: Array.from({ length: 16 }, () => "BT1-010"), security: 5 },
  },
};

export default fixture;
