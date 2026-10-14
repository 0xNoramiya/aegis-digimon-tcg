import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "leave-prevention-cost-payer-stays",
  memory: 10,
  turnSeat: 1,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: {
    holdBotAfterTurn: 5,
    opponent: {
      endBreeding: true,
      fallbackMain: "end",
      main: [{ kind: "digivolve", card: "AD1-025", base: "ST1-10" }],
      decisions: [{ sourceCard: "AD1-025", kind: "chooseTargets", target: "goblimon" }],
    },
  },
  board: {
    0: {
      battleArea: [
        { card: "EX13-038", as: "salamon", suspended: true },
        { card: "EX13-043", as: "leopardmon", suspended: true },
        { card: "BT1-064", as: "goblimon", suspended: true },
      ],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
    1: {
      battleArea: [{ card: "ST1-10", as: "phoenixmon" }],
      hand: [{ card: "AD1-025", as: "omnimon" }],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
  },
};

export default fixture;
