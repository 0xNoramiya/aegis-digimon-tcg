import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "turn-player-security-trigger-before-battle-winner",
  memory: 3,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT25-001"],
      battleArea: [
        { card: "BT24-031", as: "attacker" },
        { card: "BT24-101", as: "protector" },
        { card: "BT26-103", as: "wrathMode" },
      ],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT25-054", as: "battleWinner" }],
      hand: [{ card: "BT25-058", as: "callismon" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 5,
    },
  },
};

export default fixture;
