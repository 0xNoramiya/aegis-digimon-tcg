import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "breeding-link-limit",
  memory: 6,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      eggDeck: ["BT25-001"],
      breeding: {
        card: "BT25-022",
        as: "breedingLunamon",
        under: ["BT25-001"],
        linked: [{ card: "BT25-093", as: "existingLink" }],
      },
      hand: [{ card: "BT24-091", as: "tidalStream" }],
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
