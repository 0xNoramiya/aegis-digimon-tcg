import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "battle-protected-defender-survives-relinked-attack",
  memory: 6,
  turnSeat: 1,
  turnCount: 1,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT25-004"],
      battleArea: [{ card: "BT25-060", as: "rebootmon", top: { card: "BT25-060", as: "rebootmon-card" } }],
      hand: [{ card: "BT26-010", as: "appmonLink" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 3,
    },
    1: {
      eggDeck: ["BT1-001"],
      battleArea: [
        {
          card: "BT12-022",
          as: "protectedDefender",
          top: { card: "BT12-022", as: "protectedDefenderBase" },
        },
      ],
      hand: [{ card: "AD1-011", as: "paildramonCard" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 5,
    },
  },
  presentation: {
    opponent: {
      endBreeding: true,
      fallbackMain: "end",
      main: [{ kind: "digivolve", card: "AD1-011", base: "BT12-022" }, { kind: "attack" }],
    },
  },
};

export default fixture;
