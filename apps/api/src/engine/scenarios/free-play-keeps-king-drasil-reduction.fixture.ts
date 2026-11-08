import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "free-play-keeps-king-drasil-reduction",
  memory: 8,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT25-001"],
      breeding: {
        card: "BT13-007",
        as: "kingDrasil",
        under: [{ card: "EX13-015", as: "delayedKnight" }],
      },
      battleArea: [{ card: "BT13-110", as: "royalPurge", placedByEffect: true }],
      hand: [{ card: "BT20-017", as: "jesmon" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 3,
    },
    1: {
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: 5,
    },
  },
};

export default fixture;
