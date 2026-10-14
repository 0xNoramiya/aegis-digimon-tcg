import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      hand: [{ card: "P-240", as: "arcturusmon" }],
      battleArea: [{ card: "BT21-080", as: "hiro" }],
      trash: [
        { card: "EX12-014", as: "levelFive" },
        { card: "BT10-050", as: "levelFour" },
        { card: "EX12-021", as: "levelThree" },
        { card: "EX12-007", as: "spareGammamon" },
        { card: "EX12-013", as: "spareBetelGammamon" },
      ],
      deck: Array<string>(8).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-020", as: "opponentDigimon" }],
      deck: Array<string>(8).fill("ST1-03"),
      eggDeck: ["BT1-001"],
      security: ["ST1-03", "ST1-03", "ST1-03"],
    },
  },
  presentation: { holdBotAfterTurn: 1 },
};

export default fixture;
